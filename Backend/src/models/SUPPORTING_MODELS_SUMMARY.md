# Supporting Models Implementation Summary

## Task 1.5: Create or Enhance Supporting Models

### Overview
This document summarizes the implementation of supporting models for the Master Data Management module as specified in task 1.5.

### Models Created

#### 1. Town Model (`town.js`)
- **Purpose**: Manages town/city data for territory organization
- **Key Fields**:
  - `name` (String, required, unique) - Town name
  - `region` (String) - Region information
  - `isActive` (Boolean) - Active status
- **Features**:
  - Virtual relationship with Area model
  - Static methods: `findActive()`, `findByRegion()`
  - Automatic timestamp management

#### 2. Area Model (`area.js`)
- **Purpose**: Manages sub-divisions within towns
- **Key Fields**:
  - `name` (String, required) - Area name
  - `townId` (ObjectId, required) - Reference to Town
  - `isActive` (Boolean) - Active status
- **Features**:
  - Compound unique index on (name, townId)
  - Static methods: `findActive()`, `findByTown()`
  - Populated town reference

#### 3. Category Model (`category.js`)
- **Purpose**: Manages hierarchical product categories
- **Key Fields**:
  - `name` (String, required, unique) - Category name
  - `parentCategoryId` (ObjectId) - Parent category for hierarchy
  - `description` (String) - Category description
  - `isActive` (Boolean) - Active status
- **Features**:
  - Supports hierarchical structure
  - Virtual relationships with SubCategory and child categories
  - Static methods: `findActive()`, `findRootCategories()`, `getHierarchy()`

#### 4. SubCategory Model (`subcategory.js`)
- **Purpose**: Manages sub-categories within categories
- **Key Fields**:
  - `name` (String, required) - Sub-category name
  - `categoryId` (ObjectId, required) - Reference to Category
  - `description` (String) - Description
  - `isActive` (Boolean) - Active status
- **Features**:
  - Compound unique index on (name, categoryId)
  - Static methods: `findActive()`, `findByCategory()`

#### 5. Formula Model (`formula.js`)
- **Purpose**: Manages medicine formulas/generics
- **Key Fields**:
  - `name` (String, required, unique) - Formula/Generic name (e.g., "Paracetamol")
  - `composition` (String) - Salt composition/active ingredients
  - `description` (String) - Additional information
  - `isActive` (Boolean) - Active status
- **Features**:
  - Virtual relationship with FormulaSize model
  - Static methods: `findActive()`, `search()`
  - Search by name or composition

#### 6. FormulaSize Model (`formulasize.js`)
- **Purpose**: Manages sizes/strengths for formulas
- **Key Fields**:
  - `formulaId` (ObjectId, required) - Reference to Formula
  - `size` (String, required) - Size/Strength (e.g., "500mg", "10ml")
  - `strength` (String) - Additional strength information
  - `description` (String) - Description
  - `isActive` (Boolean) - Active status
- **Features**:
  - Compound unique index on (formulaId, size)
  - Static methods: `findActive()`, `findByFormula()`

#### 7. Business Model (`business.js`)
- **Purpose**: Manages business type classifications
- **Key Fields**:
  - `name` (String, required, unique, enum) - Business type name
  - `description` (String) - Description
  - `isActive` (Boolean) - Active status
- **Predefined Types**:
  - Surgical
  - Medicine
  - Drip Infusion
  - Consumer
  - Diaper
  - Electronics/Devices
  - Medical Equipment
  - Laboratory Supplies
  - General Items
- **Features**:
  - Enum validation for predefined types
  - Static methods: `findActive()`, `getPredefinedTypes()`

#### 8. Transporter Model (`Transporter.js`)
- **Purpose**: Manages transport companies for logistics
- **Key Fields**:
  - `code` (String, unique, auto-generated) - Transporter code (e.g., "TR0001")
  - `name` (String, required) - Transporter name
  - `contactPerson` (String) - Contact person name
  - `phone` (String) - Phone number
  - `email` (String) - Email address
  - `address` (String) - Physical address
  - `vehicleDetails` (String) - Vehicle information
  - `isActive` (Boolean) - Active status
  - `createdBy` (ObjectId) - User who created the record
- **Features**:
  - Auto-generates code in format "TR####"
  - Static methods: `findActive()`, `generateTransporterCode()`
  - Email validation

#### 9. ClaimAccount Model (`ClaimAccount.js`)
- **Purpose**: Manages claim accounts for pharmaceutical company schemes
- **Key Fields**:
  - `name` (String, required) - Claim account name (e.g., "GSK Scheme Account")
  - `accountNumber` (String) - Account number
  - `description` (String) - Description
  - `isActive` (Boolean) - Active status
  - `createdBy` (ObjectId) - User who created the record
- **Features**:
  - Static methods: `findActive()`, `hasTransactions()`
  - Used by Scheme and Invoice models for discount tracking

### Models Enhanced

#### 10. Warehouse Model (`Warehouse.js`)
- **Enhancements Added**:
  - `inchargeUserId` (ObjectId) - Reference to User (warehouse incharge)
  - `townId` (ObjectId) - Reference to Town (warehouse location)
- **Purpose**: Links warehouse to specific town and assigns an incharge user

#### 11. Salesman Model (`Salesman.js`)
- **Status**: Already exists with proper structure
- **Key Features**:
  - Links to User model via `userId`
  - Auto-generates salesman code
  - Supports commission rates and route assignments

### Model Relationships

```
Warehouse
├── townId → Town
└── inchargeUserId → User

Area
└── townId → Town

SubCategory
└── categoryId → Category

Category
└── parentCategoryId → Category (self-reference for hierarchy)

FormulaSize
└── formulaId → Formula

Scheme (existing)
└── claimAccountId → ClaimAccount

Invoice (existing)
└── claimAccountId → ClaimAccount

Item (existing)
├── formulaId → Formula
├── formulaSizeId → FormulaSize
├── categoryId → Category
├── subCategoryId → SubCategory
└── businessTypeId → Business
```

### Indexes Created

All models include appropriate indexes for:
- Unique constraints (name, code, compound keys)
- Foreign key references (townId, categoryId, formulaId, etc.)
- Active status filtering
- Performance optimization

### Testing

Comprehensive unit tests created in `tests/unit/supportingModels.test.js`:
- **27 test cases** covering all models
- **100% pass rate**
- Tests cover:
  - Model creation with valid data
  - Validation and constraints
  - Unique constraint enforcement
  - Static method functionality
  - Relationship handling
  - Auto-generation features (codes)

### Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 4.1-4.7**: Salesman Registration (model already existed)
- **Requirement 5.1-5.8**: Warehouse Registration (enhanced with inchargeUserId and townId)
- **Requirement 6.1-6.9**: Town and Area Registration (created both models)
- **Requirement 7.1-7.7**: Category and Sub-category Management (created both models)
- **Requirement 8.1-8.7**: Generic and Generic Size Registration (created Formula and FormulaSize models)
- **Requirement 9.1-9.6**: Business Type Registration (created Business model)
- **Requirement 11.1-11.7**: Transporter Registration (created Transporter model)
- **Requirement 12.1-12.7**: Claim Account Management (created ClaimAccount model)

### Integration with Existing System

All models are:
- Exported from `models/index.js` for easy import
- Compatible with existing Mongoose connection
- Follow established patterns from existing models
- Include proper validation and error handling
- Support soft delete via `isActive` flag
- Include audit fields (createdAt, updatedAt, createdBy where applicable)

### Next Steps

These models are now ready for:
1. Service layer implementation (task 5.x)
2. Controller and route creation (task 5.x)
3. Frontend integration (task 10.x)
4. API endpoint development

### Files Modified/Created

**Created:**
- `Backend/src/models/town.js`
- `Backend/src/models/area.js`
- `Backend/src/models/category.js`
- `Backend/src/models/subcategory.js`
- `Backend/src/models/formula.js`
- `Backend/src/models/formulasize.js`
- `Backend/src/models/business.js`
- `Backend/src/models/Transporter.js`
- `Backend/src/models/ClaimAccount.js`
- `Backend/tests/unit/supportingModels.test.js`
- `Backend/src/models/SUPPORTING_MODELS_SUMMARY.md`

**Modified:**
- `Backend/src/models/Warehouse.js` (added inchargeUserId and townId)
- `Backend/src/models/index.js` (added exports for all new models)

### Compliance Notes

- All models follow Mongoose best practices
- Proper indexing for performance
- Validation at schema level
- Consistent naming conventions
- Comprehensive error messages
- Support for soft deletes
- Audit trail support
