const Company = require('../models/Company');
const Item = require('../models/Item');

/**
 * Company Service
 * Handles business logic for company management
 * Requirements: 2.1-2.10
 */
class CompanyService {
  /**
   * Generate unique company code
   * @returns {Promise<string>} Generated company code
   */
  async generateCompanyCode() {
    const count = await Company.countDocuments();
    return `COMP${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Validate company data
   * @param {Object} companyData - Company data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result with errors array
   */
  async validateCompanyData(companyData, isUpdate = false) {
    const errors = [];

    // Requirement 2.1: Company name validation
    if (!isUpdate && !companyData.name) {
      errors.push({ field: 'name', message: 'Company name is required' });
    } else if (companyData.name) {
      if (companyData.name.length < 2) {
        errors.push({ field: 'name', message: 'Company name must be at least 2 characters' });
      }
      if (companyData.name.length > 100) {
        errors.push({ field: 'name', message: 'Company name cannot exceed 100 characters' });
      }
    }

    // Requirement 2.2: Group type validation
    if (companyData.groupType && !['A', 'B', 'C'].includes(companyData.groupType)) {
      errors.push({ field: 'groupType', message: 'Group type must be A, B, or C' });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create new company with validation
   * Requirements: 2.1-2.7
   * @param {Object} companyData - Company data
   * @param {string} userId - User ID creating the company
   * @returns {Promise<Object>} Created company
   */
  async createCompany(companyData, userId) {
    // Validate company data
    const validation = await this.validateCompanyData(companyData, false);
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      error.validationErrors = validation.errors;
      throw error;
    }

    // Requirement 2.1: Check name uniqueness
    const existingCompany = await Company.findOne({
      name: { $regex: new RegExp(`^${companyData.name}$`, 'i') },
    });
    if (existingCompany) {
      throw new Error('Company name already exists');
    }

    // Generate company code if not provided
    if (!companyData.code) {
      companyData.code = await this.generateCompanyCode();
    } else {
      // Check code uniqueness
      const codeExists = await Company.findOne({ code: companyData.code.toUpperCase() });
      if (codeExists) {
        throw new Error('Company code already exists');
      }
    }

    // Requirement 2.5: Default status to Active
    if (companyData.isActive === undefined) {
      companyData.isActive = true;
    }

    // Requirement 2.6: Record creation metadata
    companyData.createdBy = userId;

    // Create the company
    const company = new Company(companyData);
    await company.save();

    return this.getCompanyById(company._id);
  }

  /**
   * Get all companies with filtering
   * Requirements: 2.7-2.8
   * @param {Object} filters - Filter criteria
   * @param {string} [filters.keyword] - Search keyword
   * @param {string} [filters.groupType] - Group type filter
   * @param {boolean} [filters.isActive] - Active status filter
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @param {Object} [options.sort] - Sort criteria
   * @returns {Promise<Object>} Paginated result with companies and pagination info
   */
  async getCompanies(filters = {}, options = {}) {
    const {
      page = 1, limit = 10, sort, ...otherOptions
    } = options;
    const skip = (page - 1) * limit;

    // Build query with filters
    const query = {};

    // Text search across multiple fields
    if (filters.keyword) {
      const searchRegex = new RegExp(filters.keyword, 'i');
      query.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { contactPerson: searchRegex },
      ];
    }

    // Exact match filters
    if (filters.groupType) query.groupType = filters.groupType;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort(sort || { name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      companies,
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null,
      },
    };
  }

  /**
   * Get company by ID
   * @param {string} id - Company ID
   * @returns {Promise<Object>} Company document
   */
  async getCompanyById(id) {
    const company = await Company.findById(id).lean();

    if (!company) {
      throw new Error('Company not found');
    }
    return company;
  }

  /**
   * Get companies by group type
   * Requirement 2.7
   * @param {string} groupType - Group type (A, B, or C)
   * @returns {Promise<Array>} List of companies
   */
  async getCompaniesByGroupType(groupType) {
    if (!['A', 'B', 'C'].includes(groupType)) {
      throw new Error('Invalid group type. Must be A, B, or C');
    }

    return Company.find({ groupType, isActive: true })
      .sort({ name: 1 })
      .lean();
  }

  /**
   * Update company
   * Requirements: 2.1-2.8
   * @param {string} id - Company ID
   * @param {Object} updateData - Updated company data
   * @param {string} userId - User ID updating the company
   * @returns {Promise<Object>} Updated company
   */
  async updateCompany(id, updateData, userId) {
    // Check if company exists
    const existingCompany = await Company.findById(id);
    if (!existingCompany) {
      throw new Error('Company not found');
    }

    // Validate update data
    const validation = await this.validateCompanyData(updateData, true);
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      error.validationErrors = validation.errors;
      throw error;
    }

    // Requirement 2.1: Validate name uniqueness if being updated
    if (updateData.name && updateData.name !== existingCompany.name) {
      const nameExists = await Company.findOne({
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        _id: { $ne: id },
      });
      if (nameExists) {
        throw new Error('Company name already exists');
      }
    }

    // Validate code uniqueness if being updated
    if (updateData.code && updateData.code.toUpperCase() !== existingCompany.code) {
      const codeExists = await Company.findOne({
        code: updateData.code.toUpperCase(),
        _id: { $ne: id },
      });
      if (codeExists) {
        throw new Error('Company code already exists');
      }
    }

    // Update the company
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    return this.getCompanyById(updatedCompany._id);
  }

  /**
   * Delete company with item check
   * Requirements: 2.9-2.10
   * @param {string} id - Company ID
   * @param {string} userId - User ID deleting the company
   * @returns {Promise<Object>} Result with success status
   */
  async deleteCompany(id, userId) {
    const company = await Company.findById(id);
    if (!company) {
      throw new Error('Company not found');
    }

    // Requirement 2.10: Check if company has associated items
    const itemCount = await Item.countDocuments({ companyId: id });
    if (itemCount > 0) {
      throw new Error(`Cannot delete company. ${itemCount} item(s) are associated with this company. Please set status to Inactive instead.`);
    }

    // Delete the company
    await Company.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Company deleted successfully',
      deletedCompany: company,
    };
  }

  /**
   * Toggle company status (active/inactive)
   * Requirement 2.8-2.9
   * @param {string} id - Company ID
   * @param {string} userId - User ID toggling the status
   * @returns {Promise<Object>} Updated company
   */
  async toggleCompanyStatus(id, userId) {
    const company = await Company.findById(id);
    if (!company) {
      throw new Error('Company not found');
    }

    const newStatus = !company.isActive;

    // Requirement 2.9: When setting to Inactive, prevent new items from being assigned
    // This is enforced in item validation, not here

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { $set: { isActive: newStatus } },
      { new: true },
    );

    return this.getCompanyById(updatedCompany._id);
  }

  /**
   * Get all active companies
   * @returns {Promise<Array>} List of active companies
   */
  async getActiveCompanies() {
    return Company.find({ isActive: true })
      .sort({ name: 1 })
      .lean();
  }
}

module.exports = new CompanyService();
