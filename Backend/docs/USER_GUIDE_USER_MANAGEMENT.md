# User Guide: User Management

## Overview
User Management allows administrators to create, manage, and control user access to the system with role-based permissions.

## Accessing User Management
1. Log in as Administrator
2. Navigate to **Settings** > **User Management**
3. View list of all system users

**Note**: Only administrators can access User Management

## Creating a New User

### Step 1: Click "Add New User"
- Click **"+ Add New User"** button

### Step 2: Fill User Information

**Required Fields:**
- **Username**: Unique login name (3-50 characters)
- **Email**: Valid email address (unique)
- **Password**: Minimum 6 characters
- **Confirm Password**: Must match password
- **Role**: Select from available roles

**Optional Fields:**
- **Full Name**: User's complete name
- **Phone Number**: Contact number
- **Employee Account**: Link to employee account (if applicable)
- **Dimension/Territory**: For territory-based access control

### Step 3: Select User Role

**Available Roles:**
- **Admin**: Full system access
- **Manager**: Management-level access
- **Salesman**: Sales operations only
- **Accountant**: Financial operations
- **Store Keeper**: Inventory management
- **Store Incharge**: Warehouse management
- **Deliveryman**: Delivery operations
- **Driver**: Transport operations
- **IT Support**: Technical support access
- **Data Entry**: Data entry operations
- **Custom**: Custom permissions

### Step 4: Set Permissions (for Custom role)

**Module Permissions:**
- Master Data: View, Create, Edit, Delete
- Sales: View, Create, Edit, Delete, Approve
- Purchase: View, Create, Edit, Delete, Approve
- Inventory: View, Create, Edit, Delete, Transfer
- Accounts: View, Create, Edit, Delete, Post
- Reports: View, Export
- Settings: View, Edit

**Feature Permissions:**
- Price Modification
- Discount Authorization
- Credit Limit Override
- Delete Transactions
- Void Invoices
- Backdated Entries

### Step 5: Territory/Dimension Assignment (Optional)
- Select assigned territory
- User will only see data for assigned territory
- Leave blank for all-territory access

### Step 6: Save
- Click **"Create User"** to save
- User receives email with login credentials
- Click **"Cancel"** to discard

## Viewing Users

### List View
Displays all users showing:
- Username, Full Name, Email, Role, Status, Last Login

### Filters
- **Role**: Filter by user role
- **Status**: Active or Inactive
- **Territory**: Filter by assigned territory

### Search
- Search by username, name, or email
- Real-time results

### User Details
Click any user to view:
- Complete user information
- Assigned permissions
- Login history
- Activity log

## Editing a User

### Update User Information
1. Find user in list
2. Click **Edit** icon
3. Modify fields (except username)
4. Click **"Save"**

### Change User Role
1. Open user details
2. Click **"Change Role"**
3. Select new role
4. Confirm change
5. User permissions update automatically

**Warning**: Changing role affects user access immediately

### Update Permissions
1. Open user details
2. Click **"Edit Permissions"**
3. Check/uncheck permissions
4. Click **"Save"**

**Note**: Only available for Custom role

## Password Management

### Change Password (Self)
1. Click profile icon
2. Select **"Change Password"**
3. Enter current password
4. Enter new password
5. Confirm new password
6. Click **"Update"**

### Reset Password (Admin)
1. Find user in list
2. Click **"Reset Password"**
3. System generates temporary password
4. User receives email with new password
5. User must change password on next login

### Forgot Password (User)
1. On login page, click **"Forgot Password"**
2. Enter email address
3. Click **"Send Reset Link"**
4. Check email for reset link
5. Click link and set new password

**Password Requirements:**
- Minimum 6 characters
- At least one letter
- At least one number (recommended)
- Cannot be same as last 3 passwords

## User Status Management

### Deactivate User
1. Find user in list
2. Click **"Deactivate"** button
3. Confirm deactivation
4. User cannot log in (data preserved)

**Use Cases:**
- Employee on leave
- Temporary suspension
- Account under review

### Reactivate User
1. Filter by "Inactive" status
2. Find deactivated user
3. Click **"Activate"** button
4. User can log in again

### Delete User (Permanent)
1. Find user in list
2. Click **"Delete"** icon
3. Confirm deletion
4. User permanently removed

**Warning**: Cannot delete:
- Last active administrator
- Users with transaction history
- Currently logged-in users

## Role-Based Access Control (RBAC)

### Understanding Roles

**Admin**
- Full system access
- User management
- System configuration
- All reports

**Manager**
- View all modules
- Create/edit transactions
- Approve transactions
- Management reports

**Salesman**
- View assigned customers
- Create sales orders/invoices
- View own sales reports
- Update customer information

**Accountant**
- View financial data
- Create/edit accounts entries
- Generate financial reports
- Bank reconciliation

**Store Keeper**
- View inventory
- Stock transfers
- Stock adjustments
- Inventory reports

### Permission Hierarchy
1. Admin > Manager > Department Heads > Staff
2. Higher roles inherit lower role permissions
3. Custom roles can have mixed permissions

## Territory-Based Access

### Assigning Territory
1. Edit user
2. Select **"Dimension/Territory"**
3. Choose territory from dropdown
4. Save changes

### How It Works
- User sees only data for assigned territory
- Filters apply automatically
- Reports show territory data only
- Cannot access other territories

### Multi-Territory Access
- Assign multiple territories (if supported)
- Or leave blank for all-territory access

## User Activity Monitoring

### View Login History
1. Open user details
2. Click **"Login History"** tab
3. View all login attempts

**Information Shown:**
- Login date/time
- IP address
- Device/browser
- Success/failure status

### View Activity Log
1. Open user details
2. Click **"Activity Log"** tab
3. View user actions

**Logged Activities:**
- Created records
- Modified records
- Deleted records
- Approved transactions
- Report generation

### Export Activity Log
- Click **"Export"** button
- Select date range
- Download Excel or PDF

## Security Best Practices

### Password Security
- Change passwords every 90 days
- Use strong passwords
- Never share passwords
- Don't write passwords down

### Account Security
- Review user list monthly
- Deactivate unused accounts
- Remove terminated employees immediately
- Audit permissions quarterly

### Access Control
- Grant minimum required permissions
- Review role assignments regularly
- Monitor suspicious activity
- Enable two-factor authentication (if available)

## Common Issues and Solutions

### Issue: "Username already exists"
**Solution**: Choose different username

### Issue: "Cannot delete last admin"
**Solution**: Create another admin first

### Issue: "Password too weak"
**Solution**: Use stronger password with letters and numbers

### Issue: "User cannot log in"
**Solution**: Check if account is active; reset password if needed

### Issue: "Permission denied"
**Solution**: Contact admin to update permissions

## Keyboard Shortcuts

- **Ctrl + N**: New user
- **Ctrl + S**: Save user
- **Ctrl + F**: Search users
- **Esc**: Close dialog

## Tips and Tricks

1. **Bulk User Creation**: Use Excel import for multiple users
2. **Role Templates**: Create custom role templates for common positions
3. **Password Policy**: Enforce strong password policy
4. **Session Timeout**: Configure automatic logout after inactivity
5. **Login Alerts**: Enable email alerts for failed login attempts

## User Management Checklist

### Daily
- [ ] Monitor failed login attempts
- [ ] Review new user requests

### Weekly
- [ ] Check active user list
- [ ] Review permission change requests

### Monthly
- [ ] Audit user accounts
- [ ] Deactivate unused accounts
- [ ] Review role assignments

### Quarterly
- [ ] Full security audit
- [ ] Update permission matrix
- [ ] Review territory assignments
- [ ] Password policy review

## Support

For assistance:
- IT Support: support@industraders.com
- Phone: +92-XXX-XXXXXXX
- Help Desk: Extension 100

---

**Last Updated**: February 2026  
**Version**: 1.0
