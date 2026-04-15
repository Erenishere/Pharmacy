# Master Data Management - Manual Testing Checklist

## Task 11.3: Manual Testing Documentation

This document provides a comprehensive checklist for manual testing of the Master Data Management module.

---

## 1. CRUD Operations Testing

### 1.1 Item Management
- [ ] **Create Item**
  - Navigate to Items > Add New Item
  - Fill all required fields (name, code, company, category, etc.)
  - Verify auto-generated item code if applicable
  - Submit form and verify success message
  - Verify item appears in item list
  
- [ ] **Read/View Item**
  - Navigate to Items list
  - Click on an item to view details
  - Verify all fields display correctly
  - Verify pricing information displays
  - Verify inventory levels display
  
- [ ] **Update Item**
  - Open an existing item for editing
  - Modify various fields (name, price, stock levels)
  - Save changes and verify success message
  - Verify changes reflected in item list and detail view
  
- [ ] **Delete Item**
  - Attempt to delete an item without dependencies
  - Verify confirmation dialog appears
  - Confirm deletion and verify success message
  - Verify item removed from list (soft delete)
  - Attempt to delete item with dependencies (should fail with error)

### 1.2 Account Management
- [ ] **Create Customer Account**
  - Navigate to Accounts > Add New Account
  - Select account type: Customer
  - Fill business details fields
  - Set credit limit and payment terms
  - Submit and verify success
  
- [ ] **Create Employee Account**
  - Select account type: Employee
  - Fill employee biodata fields (CNIC, DOB, etc.)
  - Set salary and joining date
  - Submit and verify success
  
- [ ] **Create Supplier Account**
  - Select account type: Supplier
  - Fill supplier-specific fields
  - Submit and verify success
  
- [ ] **Update Account**
  - Edit existing account
  - Modify credit limit, contact info
  - Verify changes saved correctly
  
- [ ] **Delete Account**
  - Attempt to delete account without transactions
  - Attempt to delete account with transactions (should fail)

### 1.3 Company Management
- [ ] **Create Company**
  - Navigate to Companies > Add New
  - Fill company name, group type (A/B/C)
  - Add contact person details
  - Submit and verify success
  
- [ ] **Update Company**
  - Edit company details
  - Change group type
  - Verify changes saved
  
- [ ] **Delete Company**
  - Attempt to delete company without items
  - Attempt to delete company with items (should fail)
  
- [ ] **Toggle Company Status**
  - Toggle active/inactive status
  - Verify status change reflected

### 1.4 User Management
- [ ] **Create User**
  - Navigate to Users > Add New User (admin only)
  - Fill username, email, password
  - Assign role (admin, manager, user, salesman)
  - Set permissions
  - Link to employee account if applicable
  - Submit and verify success
  
- [ ] **Update User**
  - Edit user details
  - Change role
  - Modify permissions
  - Verify changes saved
  
- [ ] **Change Password**
  - Use change password feature
  - Verify old password validation
  - Set new password
  - Verify can login with new password
  
- [ ] **Deactivate User**
  - Deactivate a user account
  - Verify user cannot login

### 1.5 Supporting Master Data
- [ ] **Warehouse Management**
  - Create, view, update, delete warehouse
  - Assign incharge user
  - Verify cannot delete warehouse with stock
  
- [ ] **Town/Area Management**
  - Create town
  - Create area linked to town
  - Update town/area
  - Delete town/area (verify dependency checks)
  
- [ ] **Category/SubCategory Management**
  - Create category
  - Create subcategory under category
  - Update category/subcategory
  - Delete (verify item dependency check)
  
- [ ] **Formula/Formula Size Management**
  - Create formula (generic)
  - Create formula size
  - Update and delete
  
- [ ] **Business Type Management**
  - Create business type
  - Update and delete
  - Verify item dependency check
  
- [ ] **Salesman Management**
  - Create salesman
  - Assign to routes/areas
  - Toggle status
  - Update and delete
  
- [ ] **Transporter Management**
  - Create transporter
  - Add vehicle details
  - Update and delete
  
- [ ] **Claim Account Management**
  - Create claim account
  - Toggle status
  - Update and delete
  - Verify transaction dependency check

---

## 2. Search and Filter Functionality

### 2.1 Item Search
- [ ] **Basic Search**
  - Search by item name (partial match)
  - Search by item code
  - Search by barcode
  - Verify results display correctly
  
- [ ] **Advanced Filters**
  - Filter by company
  - Filter by category
  - Filter by subcategory
  - Filter by status (active/inactive)
  - Filter by stock level (low stock, out of stock)
  - Combine multiple filters
  - Verify filter results accurate
  
- [ ] **Sorting**
  - Sort by name (A-Z, Z-A)
  - Sort by code
  - Sort by price
  - Sort by stock level
  - Verify sort order correct

### 2.2 Account Search
- [ ] **Basic Search**
  - Search by account name
  - Search by account code
  - Search by phone number
  - Verify results display
  
- [ ] **Advanced Filters**
  - Filter by account type (customer, supplier, employee)
  - Filter by town
  - Filter by area
  - Filter by salesman
  - Filter by credit limit range
  - Filter by balance range
  - Combine multiple filters
  
- [ ] **Sorting**
  - Sort by name
  - Sort by balance
  - Sort by credit limit
  - Verify sort order

### 2.3 Company Search
- [ ] Search by company name
- [ ] Filter by group type (A, B, C)
- [ ] Sort by name
- [ ] Verify results

### 2.4 User Search
- [ ] Search by username
- [ ] Search by email
- [ ] Filter by role
- [ ] Filter by status (active/inactive)
- [ ] Verify results

---

## 3. Import/Export Features

### 3.1 Item Import
- [ ] **Excel Import - Valid Data**
  - Prepare Excel file with valid item data
  - Navigate to Items > Import
  - Upload Excel file
  - Verify import success message
  - Verify items created in database
  - Check all fields imported correctly
  
- [ ] **Excel Import - Invalid Data**
  - Prepare Excel with invalid data (missing required fields, invalid formats)
  - Upload file
  - Verify validation errors displayed
  - Verify error messages are clear and helpful
  - Verify no items created for invalid rows
  
- [ ] **Excel Import - Duplicate Data**
  - Upload file with duplicate item codes
  - Verify duplicate detection
  - Verify appropriate error message

### 3.2 Item Export
- [ ] **Excel Export**
  - Navigate to Items list
  - Apply filters (optional)
  - Click Export > Excel
  - Verify file downloads
  - Open file and verify data accuracy
  - Verify all columns present
  
- [ ] **PDF Export**
  - Click Export > PDF
  - Verify PDF downloads
  - Open PDF and verify formatting
  - Verify data accuracy

### 3.3 Account Import/Export
- [ ] **Import Accounts**
  - Prepare Excel with account data
  - Upload and verify import
  - Check different account types import correctly
  
- [ ] **Export Accounts**
  - Export to Excel
  - Export to PDF
  - Verify data accuracy in both formats

---

## 4. Validation Messages

### 4.1 Required Field Validation
- [ ] **Item Form**
  - Leave item name blank and submit
  - Verify "Item name is required" message
  - Leave item code blank
  - Verify "Item code is required" message
  - Test all required fields
  
- [ ] **Account Form**
  - Leave account name blank
  - Verify validation message
  - Leave account type unselected
  - Verify validation message
  - Test all required fields for each account type
  
- [ ] **Company Form**
  - Leave company name blank
  - Verify validation message
  - Test all required fields
  
- [ ] **User Form**
  - Leave username blank
  - Leave email blank
  - Leave password blank
  - Verify all validation messages

### 4.2 Format Validation
- [ ] **Email Validation**
  - Enter invalid email format in user/account forms
  - Verify "Invalid email format" message
  
- [ ] **Phone Number Validation**
  - Enter invalid phone number
  - Verify validation message
  
- [ ] **CNIC Validation** (Employee accounts)
  - Enter invalid CNIC format
  - Verify validation message
  
- [ ] **Date Validation**
  - Enter invalid date formats
  - Enter future dates where not allowed
  - Verify validation messages
  
- [ ] **Numeric Validation**
  - Enter negative values where not allowed
  - Enter non-numeric values in numeric fields
  - Verify validation messages

### 4.3 Business Rule Validation
- [ ] **Stock Level Validation**
  - Set minimum stock > reorder level
  - Verify validation message
  - Set reorder level > maximum stock
  - Verify validation message
  
- [ ] **Credit Limit Validation**
  - Set credit limit less than current balance
  - Verify validation message
  
- [ ] **Price Validation**
  - Set selling price < purchase price
  - Verify warning message (if applicable)
  
- [ ] **Unique Constraint Validation**
  - Create item with duplicate code
  - Verify "Item code already exists" message
  - Create item with duplicate barcode
  - Verify "Barcode already exists" message
  - Create user with duplicate username
  - Verify validation message
  - Create user with duplicate email
  - Verify validation message

### 4.4 Success Messages
- [ ] Verify success message on item creation
- [ ] Verify success message on item update
- [ ] Verify success message on item deletion
- [ ] Verify success messages for all CRUD operations
- [ ] Verify messages are clear and user-friendly
- [ ] Verify messages auto-dismiss after appropriate time

---

## 5. Error Scenarios

### 5.1 Network Errors
- [ ] **Offline Mode**
  - Disconnect network
  - Attempt to create/update item
  - Verify "Network error" or "Unable to connect" message
  - Verify user-friendly error message
  
- [ ] **Slow Network**
  - Simulate slow network (throttling)
  - Verify loading indicators display
  - Verify operations complete successfully
  - Verify timeout handling

### 5.2 Server Errors
- [ ] **500 Internal Server Error**
  - Trigger server error (if possible in test environment)
  - Verify error message displayed
  - Verify error message is user-friendly
  - Verify application doesn't crash
  
- [ ] **404 Not Found**
  - Access non-existent item/account
  - Verify "Not found" message
  - Verify graceful handling

### 5.3 Authentication Errors
- [ ] **Session Expiry**
  - Let session expire
  - Attempt to perform operation
  - Verify redirect to login page
  - Verify appropriate message
  
- [ ] **Invalid Credentials**
  - Login with wrong password
  - Verify "Invalid credentials" message
  - Verify account not locked after few attempts
  
- [ ] **Unauthorized Access**
  - Login as user with limited permissions
  - Attempt to access admin-only features
  - Verify "Access denied" or "Unauthorized" message
  - Verify features hidden/disabled for unauthorized users

### 5.4 Validation Errors
- [ ] **Bulk Import Errors**
  - Import file with mix of valid and invalid data
  - Verify partial import handling
  - Verify error report generated
  - Verify which rows failed and why
  
- [ ] **Concurrent Modification**
  - Open same item in two browser tabs
  - Modify in both tabs
  - Save in both tabs
  - Verify conflict handling
  - Verify appropriate message

### 5.5 Dependency Errors
- [ ] **Delete with Dependencies**
  - Attempt to delete company with items
  - Verify error message: "Cannot delete company with existing items"
  - Attempt to delete category with items
  - Verify appropriate error message
  - Attempt to delete account with transactions
  - Verify appropriate error message
  
- [ ] **Foreign Key Errors**
  - Attempt to create item with non-existent company
  - Verify validation error
  - Attempt to create account with non-existent town
  - Verify validation error

---

## 6. Authorization and Permissions

### 6.1 Role-Based Access
- [ ] **Admin Role**
  - Login as admin
  - Verify access to all features
  - Verify can create/edit/delete all entities
  - Verify can manage users
  
- [ ] **Manager Role**
  - Login as manager
  - Verify access to most features
  - Verify cannot manage users (if restricted)
  - Verify can view reports
  
- [ ] **User Role**
  - Login as regular user
  - Verify limited access
  - Verify cannot delete entities
  - Verify cannot access admin features
  
- [ ] **Salesman Role**
  - Login as salesman
  - Verify can only view assigned customers
  - Verify can create orders for assigned customers
  - Verify cannot access master data management

### 6.2 Dimension-Based Access
- [ ] **Territory-Based Filtering**
  - Login as user with specific dimension (territory)
  - Verify only sees data for assigned territory
  - Verify cannot access data from other territories
  - Verify filters applied automatically
  
- [ ] **Warehouse-Based Filtering**
  - Login as warehouse user
  - Verify only sees stock for assigned warehouse
  - Verify cannot access other warehouse data

---

## 7. UI/UX Testing

### 7.1 Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on laptop (1366x768)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify all elements visible and usable
- [ ] Verify tables scroll horizontally on small screens

### 7.2 Browser Compatibility
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Edge
- [ ] Test on Safari (if available)
- [ ] Verify consistent behavior across browsers

### 7.3 Loading States
- [ ] Verify loading spinners display during API calls
- [ ] Verify skeleton loaders for lists
- [ ] Verify disabled state for buttons during submission
- [ ] Verify loading doesn't block entire UI unnecessarily

### 7.4 Pagination
- [ ] Navigate through pages
- [ ] Change page size (10, 25, 50, 100)
- [ ] Verify page numbers display correctly
- [ ] Verify "Next" and "Previous" buttons work
- [ ] Verify "First" and "Last" page navigation

### 7.5 Form Usability
- [ ] Tab order is logical
- [ ] Enter key submits form
- [ ] Escape key cancels/closes dialogs
- [ ] Required fields marked with asterisk
- [ ] Help text/tooltips available where needed
- [ ] Date pickers work correctly
- [ ] Dropdowns populate correctly
- [ ] Autocomplete works for search fields

---

## 8. Performance Testing

### 8.1 Large Datasets
- [ ] Load item list with 1000+ items
- [ ] Verify pagination works smoothly
- [ ] Verify search is responsive
- [ ] Verify no UI lag or freezing

### 8.2 Concurrent Users
- [ ] Multiple users accessing system simultaneously
- [ ] Verify no conflicts
- [ ] Verify data consistency

---

## 9. Data Integrity

### 9.1 Audit Trail
- [ ] Create item and verify created_by field
- [ ] Update item and verify updated_by field
- [ ] Verify timestamps accurate
- [ ] Verify audit log entries created

### 9.2 Soft Delete
- [ ] Delete item
- [ ] Verify item marked as deleted (not removed from database)
- [ ] Verify deleted items don't appear in normal lists
- [ ] Verify can restore deleted items (if feature exists)

---

## 10. Integration Points

### 10.1 Item-Company Integration
- [ ] Create item with company
- [ ] Verify company details display in item view
- [ ] Update company and verify reflected in items

### 10.2 Account-Town-Area Integration
- [ ] Create account with town and area
- [ ] Verify geographic hierarchy works
- [ ] Filter accounts by town
- [ ] Verify area belongs to correct town

### 10.3 User-Account Integration
- [ ] Create employee account
- [ ] Create user linked to employee account
- [ ] Verify link works correctly
- [ ] Verify user can access employee details

---

## Testing Sign-Off

### Tester Information
- **Tester Name**: ___________________________
- **Date**: ___________________________
- **Environment**: ___________________________

### Summary
- **Total Test Cases**: ___________________________
- **Passed**: ___________________________
- **Failed**: ___________________________
- **Blocked**: ___________________________

### Issues Found
| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
|         |             |          |        |
|         |             |          |        |
|         |             |          |        |

### Overall Assessment
- [ ] All critical functionality working
- [ ] All validation working correctly
- [ ] All error scenarios handled gracefully
- [ ] UI is user-friendly and responsive
- [ ] Performance is acceptable
- [ ] Ready for production

### Notes
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________

