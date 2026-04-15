const companyService = require('../services/companyService');

/**
 * Company Controller
 * Handles HTTP requests for company management
 * Requirements: 2.1-2.10
 */

/**
 * Get all companies with filtering and pagination
 * @route GET /api/v1/companies
 * Requirements: 2.7-2.8
 */
const getAllCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy = 'name',
      sortOrder = 'asc',
      keyword,
      groupType,
      isActive,
      ...otherFilters
    } = req.query;

    // Build filters object
    const filters = {
      ...(keyword && { keyword }),
      ...(groupType && { groupType }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...otherFilters,
    };

    // Build sort options
    const sortOptions = {};
    if (sort) {
      // Handle sort parameter in format: 'field:asc' or 'field:desc'
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else if (sortBy) {
      // Fallback to sortBy and sortOrder if sort is not provided
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Get paginated companies with filters
    const result = await companyService.getCompanies(filters, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // Limit to 100 items per page max
      sort: sortOptions,
    });

    return res.status(200).json({
      success: true,
      data: result.companies,
      pagination: result.pagination,
      message: 'Companies retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get all companies error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve companies',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get company by ID
 * @route GET /api/v1/companies/:id
 * Requirements: 2.7
 */
const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await companyService.getCompanyById(id);

    return res.status(200).json({
      success: true,
      data: company,
      message: 'Company retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get company by ID error:', error);

    if (error.message === 'Company not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve company',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get companies by group type
 * @route GET /api/v1/companies/group/:type
 * Requirements: 2.2, 2.7
 */
const getCompaniesByGroupType = async (req, res) => {
  try {
    const { type } = req.params;
    const companies = await companyService.getCompaniesByGroupType(type);

    return res.status(200).json({
      success: true,
      data: companies,
      count: companies.length,
      message: `Companies with group type ${type} retrieved successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get companies by group type error:', error);

    if (error.message.includes('Invalid group type')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to retrieve companies',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create new company
 * @route POST /api/v1/companies
 * Requirements: 2.1-2.7
 */
const createCompany = async (req, res) => {
  try {
    const companyData = req.body;
    const userId = req.user?.id || req.user?._id;

    const newCompany = await companyService.createCompany(companyData, userId);

    return res.status(201).json({
      success: true,
      data: newCompany,
      message: 'Company created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create company error:', error);

    // Handle validation errors
    if (error.validationErrors) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.validationErrors,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message === 'Company name already exists'
      || error.message === 'Company code already exists'
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to create company',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update company
 * @route PUT /api/v1/companies/:id
 * Requirements: 2.1-2.8
 */
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id || req.user?._id;

    const updatedCompany = await companyService.updateCompany(id, updateData, userId);

    return res.status(200).json({
      success: true,
      data: updatedCompany,
      message: 'Company updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update company error:', error);

    if (error.message === 'Company not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Handle validation errors
    if (error.validationErrors) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.validationErrors,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (
      error.message === 'Company name already exists'
      || error.message === 'Company code already exists'
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update company',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete company (with validation)
 * @route DELETE /api/v1/companies/:id
 * Requirements: 2.9-2.10
 */
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const result = await companyService.deleteCompany(id, userId);

    return res.status(200).json({
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete company error:', error);

    if (error.message === 'Company not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Requirement 2.10: Prevent deletion when items exist
    if (error.message.includes('Cannot delete company')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BUSINESS_RULE_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to delete company',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Toggle company status (active/inactive)
 * @route PATCH /api/v1/companies/:id/status
 * Requirements: 2.8-2.9
 */
const toggleCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const updatedCompany = await companyService.toggleCompanyStatus(id, userId);

    return res.status(200).json({
      success: true,
      data: updatedCompany,
      message: `Company ${updatedCompany.isActive ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Toggle company status error:', error);

    if (error.message === 'Company not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to toggle company status',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Advanced search for companies
 * @route GET /api/v1/companies/search
 * Requirements: 2.7-2.8
 */
const searchCompanies = async (req, res) => {
  try {
    const searchService = require('../services/searchService');

    // Extract search criteria from query parameters
    const {
      searchText = '',
      page = 1,
      limit = 50,
      sortField = 'name',
      sortOrder = 'asc',
      // Filter parameters
      groupType,
      isActive,
    } = req.query;

    // Build filters array
    const filters = [];

    if (groupType) {
      filters.push({ field: 'groupType', operator: 'equals', value: groupType });
    }
    if (isActive !== undefined) {
      filters.push({ field: 'isActive', operator: 'equals', value: isActive === 'true' });
    }

    // Build sort array
    const sort = [{ field: sortField, order: sortOrder }];

    // Build search criteria
    const searchCriteria = {
      filters,
      sort,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      searchText,
    };

    // Perform search
    const results = await searchService.searchCompanies(searchCriteria);

    return res.status(200).json({
      success: true,
      data: results.results,
      pagination: results.pagination,
      message: 'Companies search completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search companies error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to search companies',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getAllCompanies,
  getCompanyById,
  getCompaniesByGroupType,
  createCompany,
  updateCompany,
  deleteCompany,
  toggleCompanyStatus,
  searchCompanies,
};
