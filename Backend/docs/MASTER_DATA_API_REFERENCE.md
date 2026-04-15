# Master Data Management - API Reference

## Base URL
- Development: `http://localhost:3000/api/v1`
- Production: `https://api.industraders.com/api/v1`

## Authentication
All endpoints require JWT Bearer token: `Authorization: Bearer <token>`

## Common Response Format
```json
{
  "success": true|false,
  "data": {},
  "message": "string",
  "error": { "code": "string", "message": "string" }
}
```

## Common Query Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (prefix with `-` for descending)
- `search`: Search keyword
- `status`: Filter by status (active/inactive)

## Error Codes
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate)
- `500` - Internal Server Error

---

## Item Management

### POST /items
Create new item
**Body**: code, name, companyId, categoryId, pricing, inventory, tax
**Response**: 201 Created

### GET /items
List items with pagination and filters
**Query**: page, limit, search, companyId, categoryId, sellingGroup, status
**Response**: 200 OK with items array and pagination

### GET /items/:id
Get item by ID
**Response**: 200 OK with item details

### GET /items/code/:code
Get item by code
**Response**: 200 OK

### GET /items/barcode/:barcode
Get item by barcode
**Response**: 200 OK

### PUT /items/:id
Update item
**Body**: Partial item data
**Response**: 200 OK

### DELETE /items/:id
Soft delete item
**Response**: 200 OK

### PATCH /items/:id/toggle-status
Toggle active/inactive status
**Response**: 200 OK

### GET /items/low-stock
Get low stock items
**Query**: threshold
**Response**: 200 OK with low stock items

### GET /items/expiring-soon
Get items expiring soon
**Query**: days (default: 30)
**Response**: 200 OK with expiring items

---

## Company Management

### POST /companies
Create company
**Body**: name, code, groupType (A/B/C), contactPerson, phone, email
**Response**: 201 Created

### GET /companies
List companies
**Query**: page, limit, search, groupType, status
**Response**: 200 OK

### GET /companies/:id
Get company by ID
**Response**: 200 OK

### GET /companies/group/:type
Get companies by group type (A/B/C)
**Response**: 200 OK

### PUT /companies/:id
Update company
**Response**: 200 OK

### DELETE /companies/:id
Delete company (fails if items exist)
**Response**: 200 OK or 400 if items exist

### PATCH /companies/:id/status
Toggle company status
**Response**: 200 OK

---

## Account Management

### POST /accounts
Create account
**Body**: name, accountType (customer/supplier/employee/investor), contactInfo, financialInfo
**Response**: 201 Created

### GET /accounts
List accounts
**Query**: page, limit, search, accountType, townId, salesmanId, status
**Response**: 200 OK

### GET /accounts/:id
Get account by ID
**Response**: 200 OK with populated references

### GET /accounts/type/:type
Get accounts by type
**Response**: 200 OK

### PUT /accounts/:id
Update account
**Response**: 200 OK

### DELETE /accounts/:id
Delete account (fails if transactions exist)
**Response**: 200 OK or 400 if transactions exist

### PATCH /accounts/:id/balance
Update account balance
**Body**: amount, operation (add/subtract)
**Response**: 200 OK

### GET /accounts/:id/ledger
Get account ledger
**Query**: startDate, endDate, page, limit
**Response**: 200 OK with ledger entries

### GET /accounts/:id/transactions
Get account transactions
**Query**: startDate, endDate, type, page, limit
**Response**: 200 OK

### GET /accounts/credit-limit-check
Check credit limit for accounts
**Query**: accountId, amount
**Response**: 200 OK with check result

---

## User Management

### POST /users
Create user (admin only)
**Body**: username, email, password, role, accountId, dimensionId, permissions
**Response**: 201 Created

### GET /users
List users
**Query**: page, limit, search, role, status
**Response**: 200 OK

### GET /users/:id
Get user by ID
**Response**: 200 OK

### PUT /users/:id
Update user
**Response**: 200 OK

### DELETE /users/:id
Deactivate user
**Response**: 200 OK

### PATCH /users/:id/password
Change password
**Body**: currentPassword, newPassword
**Response**: 200 OK

### PATCH /users/:id/role
Update user role
**Body**: role
**Response**: 200 OK

### PATCH /users/:id/permissions
Update user permissions
**Body**: permissions object
**Response**: 200 OK

### POST /users/forgot-password
Request password reset
**Body**: email
**Response**: 200 OK

### POST /users/reset-password
Reset password with token
**Body**: token, newPassword
**Response**: 200 OK

---

## Warehouse Management

### POST /warehouses
Create warehouse
**Body**: name, code, location, inchargeUserId
**Response**: 201 Created

### GET /warehouses
List warehouses
**Response**: 200 OK

### GET /warehouses/:id
Get warehouse by ID
**Response**: 200 OK

### PUT /warehouses/:id
Update warehouse
**Response**: 200 OK

### DELETE /warehouses/:id
Delete warehouse (fails if stock exists)
**Response**: 200 OK or 400 if stock exists

---

## Town & Area Management

### POST /towns
Create town
**Body**: name, code
**Response**: 201 Created

### GET /towns
List towns
**Response**: 200 OK

### GET /towns/:id
Get town by ID
**Response**: 200 OK

### PUT /towns/:id
Update town
**Response**: 200 OK

### DELETE /towns/:id
Delete town (fails if accounts exist)
**Response**: 200 OK or 400 if accounts exist

### POST /areas
Create area
**Body**: name, code, townId
**Response**: 201 Created

### GET /areas
List areas
**Response**: 200 OK

### GET /areas/town/:townId
Get areas by town
**Response**: 200 OK

### PUT /areas/:id
Update area
**Response**: 200 OK

### DELETE /areas/:id
Delete area
**Response**: 200 OK

---

## Category Management

### POST /categories
Create category
**Body**: name, code, description
**Response**: 201 Created

### GET /categories
List categories with hierarchy
**Response**: 200 OK

### GET /categories/:id
Get category by ID
**Response**: 200 OK

### PUT /categories/:id
Update category
**Response**: 200 OK

### DELETE /categories/:id
Delete category (fails if items exist)
**Response**: 200 OK or 400 if items exist

### POST /subcategories
Create subcategory
**Body**: name, code, categoryId
**Response**: 201 Created

### GET /subcategories
List subcategories
**Response**: 200 OK

### GET /subcategories/category/:categoryId
Get subcategories by category
**Response**: 200 OK

### PUT /subcategories/:id
Update subcategory
**Response**: 200 OK

### DELETE /subcategories/:id
Delete subcategory
**Response**: 200 OK

---

## Formula Management

### POST /formulas
Create formula/generic
**Body**: name, code, description
**Response**: 201 Created

### GET /formulas
List formulas
**Response**: 200 OK

### GET /formulas/:id
Get formula by ID
**Response**: 200 OK

### PUT /formulas/:id
Update formula
**Response**: 200 OK

### DELETE /formulas/:id
Delete formula
**Response**: 200 OK

### POST /formula-sizes
Create formula size
**Body**: name, code, formulaId, size
**Response**: 201 Created

### GET /formula-sizes
List formula sizes
**Response**: 200 OK

### GET /formula-sizes/formula/:formulaId
Get sizes by formula
**Response**: 200 OK

### PUT /formula-sizes/:id
Update formula size
**Response**: 200 OK

### DELETE /formula-sizes/:id
Delete formula size
**Response**: 200 OK

---

## Business Type Management

### POST /business-types
Create business type
**Body**: name, code, description
**Response**: 201 Created

### GET /business-types
List business types
**Response**: 200 OK

### GET /business-types/:id
Get business type by ID
**Response**: 200 OK

### PUT /business-types/:id
Update business type
**Response**: 200 OK

### DELETE /business-types/:id
Delete business type (fails if items exist)
**Response**: 200 OK or 400 if items exist

---

## Salesman Management

### POST /salesmen
Create salesman
**Body**: name, code, phone, email, areaIds, commission
**Response**: 201 Created

### GET /salesmen
List salesmen
**Response**: 200 OK

### GET /salesmen/:id
Get salesman by ID
**Response**: 200 OK

### PUT /salesmen/:id
Update salesman
**Response**: 200 OK

### DELETE /salesmen/:id
Delete salesman
**Response**: 200 OK

### PATCH /salesmen/:id/status
Toggle salesman status
**Response**: 200 OK

---

## Transporter Management

### POST /transporters
Create transporter
**Body**: name, code, phone, vehicleDetails
**Response**: 201 Created

### GET /transporters
List transporters
**Response**: 200 OK

### GET /transporters/:id
Get transporter by ID
**Response**: 200 OK

### PUT /transporters/:id
Update transporter
**Response**: 200 OK

### DELETE /transporters/:id
Delete transporter
**Response**: 200 OK

---

## Claim Account Management

### POST /claim-accounts
Create claim account
**Body**: name, code, type, description
**Response**: 201 Created

### GET /claim-accounts
List claim accounts
**Response**: 200 OK

### GET /claim-accounts/:id
Get claim account by ID
**Response**: 200 OK

### PUT /claim-accounts/:id
Update claim account
**Response**: 200 OK

### DELETE /claim-accounts/:id
Delete claim account (fails if transactions exist)
**Response**: 200 OK or 400 if transactions exist

### PATCH /claim-accounts/:id/status
Toggle claim account status
**Response**: 200 OK

---

## Search & Filter

### GET /items/search
Advanced item search
**Query**: keyword, companyId, categoryId, priceMin, priceMax, stockMin, stockMax, page, limit, sort
**Response**: 200 OK with search results

### GET /accounts/search
Advanced account search
**Query**: keyword, accountType, townId, areaId, salesmanId, creditLimitMin, creditLimitMax, page, limit, sort
**Response**: 200 OK with search results

### GET /companies/search
Search companies
**Query**: keyword, groupType, page, limit, sort
**Response**: 200 OK with search results

---

## Import/Export

### POST /items/bulk-import
Import items from Excel
**Content-Type**: multipart/form-data
**Body**: file (Excel file)
**Response**: 200 OK with import summary (success count, error count, errors array)

### GET /items/export
Export items to Excel or PDF
**Query**: format (excel/pdf), filters (optional)
**Response**: File download

### POST /accounts/bulk-import
Import accounts from Excel
**Content-Type**: multipart/form-data
**Body**: file (Excel file)
**Response**: 200 OK with import summary

### GET /accounts/export
Export accounts to Excel or PDF
**Query**: format (excel/pdf), filters (optional)
**Response**: File download

---

## Validation Rules

### Item
- code: Required, unique, 3-50 chars
- name: Required, 3-200 chars
- companyId: Required, valid ObjectId
- sellingGroup: A, B, or C
- pricing.purchasePrice: >= 0
- pricing.retailPrice: >= 0
- inventory.minimumStock: >= 0
- inventory.reorderPoint: >= minimumStock
- inventory.maximumStock: >= reorderPoint
- tax.gstRate: 0, 4, or 18
- barcode: Unique if provided

### Company
- name: Required, unique, 3-100 chars
- code: Unique if provided
- groupType: A, B, or C

### Account
- name: Required, 3-200 chars
- accountType: customer, supplier, employee, or investor
- creditLimit: >= 0
- balance: >= 0

### User
- username: Required, unique, 3-50 chars
- email: Required, unique, valid email
- password: Required, min 6 chars
- role: Valid role from system roles

---

## Rate Limiting
- 100 requests per minute per IP
- 1000 requests per hour per user

## Pagination Limits
- Default page size: 20
- Maximum page size: 100

## File Upload Limits
- Maximum file size: 10MB
- Supported formats: .xlsx, .xls

---

For detailed request/response examples and Swagger UI, visit:
- Development: http://localhost:3000/api-docs
- Production: https://api.industraders.com/api-docs
