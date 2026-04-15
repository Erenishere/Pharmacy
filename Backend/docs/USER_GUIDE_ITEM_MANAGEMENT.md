# User Guide: Item Management

## Overview
The Item Management module allows you to create, view, update, and manage all products/items in your inventory system.

## Accessing Item Management
1. Log in to the system
2. Navigate to **Master Data** > **Items** from the main menu
3. You will see the Items list page

## Creating a New Item

### Step 1: Click "Add New Item"
- Click the **"+ Add New Item"** button in the top right corner

### Step 2: Fill Basic Information
**Required Fields:**
- **Item Code**: Unique identifier (auto-generated or manual)
- **Item Name**: Full name of the product
- **Company**: Select manufacturer/company from dropdown
- **Category**: Select product category
- **Business Type**: Select business classification

**Optional Fields:**
- **Description**: Detailed product description
- **Subcategory**: More specific classification
- **Formula/Generic**: For pharmaceutical items
- **Formula Size**: Size/strength of formula
- **Barcode**: Product barcode (must be unique)
- **SKU**: Stock Keeping Unit

### Step 3: Set Pricing
Enter pricing information:
- **Purchase Price**: Cost price from supplier
- **Trade Price**: Price for trade customers
- **Retail Price**: Price for retail customers
- **MRP**: Maximum Retail Price
- **Wholesale Price**: Price for wholesale customers
- **Distributor Price**: Price for distributors

### Step 4: Configure Inventory
- **Opening Stock**: Initial stock quantity
- **Minimum Stock**: Alert level for low stock
- **Reorder Point**: When to reorder
- **Maximum Stock**: Maximum storage capacity

**Note**: Minimum ≤ Reorder Point ≤ Maximum

### Step 5: Set Tax Information
- **GST Rate**: Select 0%, 4%, or 18%
- **WHT Rate**: Withholding tax rate
- **Tax Category**: Standard, exempt, or zero-rated

### Step 6: Additional Details
- **Unit**: Select measurement unit (piece, kg, liter, etc.)
- **Pack Size**: Number of units per pack
- **Selling Group**: A, B, or C classification
- **Status**: Active or Inactive

### Step 7: Save
- Click **"Save"** to create the item
- Click **"Save & Add Another"** to create multiple items
- Click **"Cancel"** to discard changes

## Viewing Items

### List View
- All items displayed in a table format
- Shows: Code, Name, Company, Category, Price, Stock, Status
- Default: 20 items per page

### Filters
- **Search**: Search by name, code, or barcode
- **Company**: Filter by manufacturer
- **Category**: Filter by category
- **Selling Group**: Filter by A, B, or C
- **Status**: Active or Inactive items
- **Stock Level**: All, Low Stock, Out of Stock

### Sorting
Click column headers to sort:
- Name (A-Z or Z-A)
- Code
- Price (Low to High or High to Low)
- Stock (Low to High or High to Low)

### Item Details
- Click on any item row to view full details
- View all information including pricing, inventory, and tax

## Editing an Item

### Method 1: From List
1. Find the item in the list
2. Click the **Edit** icon (pencil) in the Actions column
3. Modify the required fields
4. Click **"Save"** to update

### Method 2: From Detail View
1. Open item details
2. Click **"Edit"** button at the top
3. Make changes
4. Click **"Save"**

**Note**: Item code cannot be changed after creation

## Deleting an Item

### Soft Delete
1. Find the item in the list
2. Click the **Delete** icon (trash) in the Actions column
3. Confirm deletion in the popup dialog
4. Item will be marked as deleted (not permanently removed)

**Note**: Items with transaction history cannot be deleted

### Restoring Deleted Items
1. Enable "Show Deleted" filter
2. Find the deleted item
3. Click **"Restore"** button
4. Item will be reactivated

## Managing Item Status

### Toggle Status
1. Find the item
2. Click the **Status Toggle** switch
3. Item status changes between Active/Inactive

**Active Items**: Available for transactions
**Inactive Items**: Hidden from transaction screens

## Low Stock Alerts

### Viewing Low Stock Items
1. Click **"Low Stock"** filter
2. System shows items below reorder point
3. Red indicator shows critically low items

### Taking Action
- Review low stock list regularly
- Create purchase orders for items below reorder point
- Adjust reorder points based on demand

## Expiring Items (For Batch-Tracked Items)

### Viewing Expiring Items
1. Click **"Expiring Soon"** filter
2. Set days threshold (default: 30 days)
3. System shows items expiring within threshold

### Managing Expiry
- Review expiring items weekly
- Plan promotions or discounts
- Update inventory records

## Import/Export

### Importing Items from Excel
1. Click **"Import"** button
2. Download the Excel template
3. Fill in item data following the template format
4. Upload the completed file
5. Review import summary
6. Fix any errors and re-import if needed

**Template Columns**:
- Code, Name, Company, Category, Purchase Price, Retail Price, Opening Stock, etc.

### Exporting Items
1. Apply desired filters (optional)
2. Click **"Export"** button
3. Select format: Excel or PDF
4. File will download automatically

**Export Uses**:
- Backup item data
- Share with suppliers
- Print price lists
- Analyze inventory

## Search and Filter

### Quick Search
- Type in the search box at the top
- Searches: Item name, code, barcode
- Results update as you type

### Advanced Search
1. Click **"Advanced Search"** button
2. Set multiple criteria:
   - Price range
   - Stock range
   - Multiple categories
   - Multiple companies
3. Click **"Apply Filters"**
4. Click **"Clear Filters"** to reset

## Best Practices

### Item Codes
- Use consistent naming convention
- Include category prefix (e.g., MED-001 for medicines)
- Keep codes short but meaningful

### Pricing
- Update prices regularly
- Maintain price history
- Set competitive retail prices
- Ensure purchase price < retail price

### Inventory Levels
- Set realistic minimum stock levels
- Review and adjust reorder points quarterly
- Monitor fast-moving items closely

### Data Quality
- Enter complete information
- Use consistent naming
- Verify barcodes before saving
- Keep descriptions clear and concise

## Common Issues and Solutions

### Issue: "Item code already exists"
**Solution**: Use a different code or check if item already exists

### Issue: "Barcode already exists"
**Solution**: Verify barcode is correct; each barcode must be unique

### Issue: "Cannot delete item"
**Solution**: Item has transaction history; deactivate instead of deleting

### Issue: "Minimum stock greater than maximum"
**Solution**: Ensure Minimum ≤ Reorder ≤ Maximum

### Issue: "Invalid GST rate"
**Solution**: Select only 0%, 4%, or 18%

## Keyboard Shortcuts

- **Ctrl + N**: Add new item
- **Ctrl + S**: Save item
- **Ctrl + F**: Focus search box
- **Esc**: Close dialog/cancel
- **Enter**: Submit form

## Tips and Tricks

1. **Bulk Updates**: Use Excel import to update multiple items at once
2. **Quick Filters**: Save frequently used filter combinations
3. **Stock Alerts**: Set up email notifications for low stock
4. **Price Lists**: Export filtered items to create custom price lists
5. **Barcode Scanning**: Use barcode scanner for quick item lookup

## Support

For additional help:
- Contact IT Support: support@industraders.com
- Phone: +92-XXX-XXXXXXX
- Internal Help Desk: Extension 100

---

**Last Updated**: February 2026  
**Version**: 1.0
