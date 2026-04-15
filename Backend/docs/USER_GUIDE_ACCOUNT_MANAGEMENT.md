# User Guide: Account Management

## Overview
The Account Management module handles all business accounts including customers, suppliers, employees, and investors.

## Accessing Account Management
1. Log in to the system
2. Navigate to **Master Data** > **Accounts**
3. Select account type from tabs: All, Customers, Suppliers, Employees, Investors

## Creating a New Account

### Step 1: Click "Add New Account"
- Click **"+ Add New Account"** button

### Step 2: Select Account Type
Choose one of:
- **Customer**: For sales transactions
- **Supplier**: For purchase transactions
- **Employee**: For staff management
- **Investor**: For investment tracking

### Step 3: Fill Basic Information

**Required Fields:**
- **Account Name**: Full name or business name
- **Account Code**: Unique identifier (auto-generated or manual)
- **Account Type**: Selected in Step 2

**Contact Information:**
- Phone Number
- Email Address
- Address
- Town/City
- Area
- Postal Code

### Step 4: Type-Specific Information

#### For Customer/Supplier Accounts:
**Business Details:**
- Business Name
- Business Type
- Tax Registration Number (NTN/STRN)
- Sales Tax Number
- Contact Person Name
- Contact Person Phone

**Financial Information:**
- Credit Limit
- Payment Terms (days)
- Opening Balance
- Currency (default: PKR)

**Assignment:**
- Assigned Salesman (for customers)
- Route (for customers)

#### For Employee Accounts:
**Employee Biodata:**
- CNIC Number
- Date of Birth
- Gender
- Marital Status
- Father/Husband Name
- Emergency Contact
- Blood Group

**Employment Details:**
- Designation
- Department
- Joining Date
- Basic Salary
- Bank Account Details

#### For Investor Accounts:
**Investment Details:**
- Investment Amount
- Investment Date
- Share Percentage
- Return Rate

### Step 5: Banking Information (Optional)
- Bank Name
- Account Title
- Account Number
- Branch Code
- IBAN

### Step 6: Additional Settings
- **Status**: Active or Inactive
- **Allow Credit**: Yes or No
- **Price List**: Default price list for customer

### Step 7: Save
- Click **"Save"** to create account
- Click **"Cancel"** to discard

## Viewing Accounts

### List View
Displays accounts in table format showing:
- Code, Name, Type, Town, Balance, Credit Limit, Status

### Filters
- **Account Type**: Customer, Supplier, Employee, Investor
- **Town**: Filter by location
- **Salesman**: Filter by assigned salesman
- **Status**: Active or Inactive
- **Credit Status**: Within limit, Exceeded limit

### Search
- Search by name, code, phone, or email
- Results update in real-time

### Account Details
Click any account to view:
- Complete account information
- Transaction history
- Ledger
- Outstanding balance
- Credit limit status

## Editing an Account

1. Find account in list
2. Click **Edit** icon
3. Modify required fields
4. Click **"Save"**

**Note**: Account code and type cannot be changed after creation

## Managing Account Balance

### View Balance
- Current balance shown in account details
- Green: Credit balance
- Red: Debit balance

### Manual Balance Adjustment
1. Open account details
2. Click **"Adjust Balance"**
3. Enter amount and reason
4. Click **"Save"**

**Note**: Use only for corrections; normal transactions update balance automatically

## Account Ledger

### Viewing Ledger
1. Open account details
2. Click **"Ledger"** tab
3. View all transactions chronologically

### Ledger Information
- Date
- Transaction Type
- Reference Number
- Debit Amount
- Credit Amount
- Running Balance
- Description

### Filters
- Date Range
- Transaction Type
- Amount Range

### Export Ledger
- Click **"Export"** button
- Select Excel or PDF format
- Choose date range

## Credit Limit Management

### Setting Credit Limit
1. Edit account
2. Enter credit limit amount
3. Save changes

### Credit Limit Alerts
- Yellow warning: 80% of limit used
- Red alert: Limit exceeded
- System blocks transactions if limit exceeded (configurable)

### Checking Credit Status
1. Open account details
2. View "Credit Status" section
3. Shows: Limit, Used, Available

## Account Transactions

### View Transactions
1. Open account details
2. Click **"Transactions"** tab
3. View all sales, purchases, payments, receipts

### Transaction Details
- Transaction Date
- Type (Invoice, Payment, Receipt)
- Reference Number
- Amount
- Status

### Filter Transactions
- By date range
- By transaction type
- By status

## Sub-Accounts (Hierarchical Accounts)

### Creating Sub-Account
1. Open parent account
2. Click **"Add Sub-Account"**
3. Fill sub-account details
4. Parent account automatically linked

### Viewing Sub-Accounts
- Sub-accounts listed under parent
- Indented display shows hierarchy
- Consolidated balance includes sub-accounts

## Import/Export

### Importing Accounts
1. Click **"Import"** button
2. Download Excel template
3. Fill account data
4. Upload file
5. Review import summary

**Template Columns**:
- Code, Name, Type, Phone, Email, Town, Credit Limit, Opening Balance

### Exporting Accounts
1. Apply filters (optional)
2. Click **"Export"**
3. Select format (Excel/PDF)
4. File downloads automatically

## Account Reports

### Available Reports
- Account List
- Account Ledger
- Outstanding Balances
- Credit Limit Report
- Aging Analysis
- Customer/Supplier Summary

### Generating Reports
1. Navigate to **Reports** > **Accounts**
2. Select report type
3. Set parameters (date range, filters)
4. Click **"Generate"**
5. View or export report

## Best Practices

### Account Codes
- Use consistent format
- Include type prefix (C- for customer, S- for supplier)
- Keep codes meaningful

### Credit Limits
- Set realistic limits based on business relationship
- Review limits quarterly
- Document limit increase requests

### Data Accuracy
- Verify contact information
- Keep tax numbers updated
- Maintain accurate addresses

### Regular Reviews
- Review inactive accounts monthly
- Update contact information
- Verify outstanding balances

## Common Issues and Solutions

### Issue: "Account code already exists"
**Solution**: Use different code or check if account exists

### Issue: "Cannot delete account"
**Solution**: Account has transactions; deactivate instead

### Issue: "Credit limit exceeded"
**Solution**: Increase limit or collect payment before new transaction

### Issue: "Invalid CNIC format"
**Solution**: Enter 13-digit CNIC without dashes

### Issue: "Town not found"
**Solution**: Create town first in Town Management

## Keyboard Shortcuts

- **Ctrl + N**: New account
- **Ctrl + S**: Save account
- **Ctrl + F**: Search
- **Ctrl + L**: View ledger
- **Esc**: Close dialog

## Tips and Tricks

1. **Quick Balance Check**: Hover over account name to see balance tooltip
2. **Bulk Updates**: Use Excel import for mass updates
3. **Credit Alerts**: Enable email notifications for credit limit warnings
4. **Ledger Export**: Export ledgers for customer statements
5. **Sub-Accounts**: Use for branch-wise customer management

## Support

For help:
- IT Support: support@industraders.com
- Phone: +92-XXX-XXXXXXX
- Help Desk: Extension 100

---

**Last Updated**: February 2026  
**Version**: 1.0
