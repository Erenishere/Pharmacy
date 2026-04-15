# Salary Calculation Component

## Overview
The Salary Calculation Component provides a comprehensive interface for calculating employee salaries based on their salary packages and actual performance data. It displays a detailed breakdown of all salary components including fixed components, target-based incentives, mobile incentives, brand incentives, bonuses, and deductions.

## Features

### 1. Calculation Form
- **Employee Selection**: Dropdown to select employee from active employees list
- **Month Selection**: Dropdown with all 12 months
- **Year Selection**: Dropdown with years (current year ± 2 years)
- **Calculate Button**: Triggers salary calculation via API

### 2. Calculation Breakdown Display

#### Fixed Components
- Basic Pay
- Daily Allowance
- Petrol Allowance
- Mobile Package

#### Target-Based Incentives
- **Sales Incentive**: Shows target, achieved amount, achievement percentage, and incentive amount
- **Recovery Incentive**: Shows target, achieved amount, achievement percentage, and incentive amount
- **Party Visit Incentive**: Shows target visits, achieved visits, achievement percentage, and incentive amount

Each incentive displays achievement badges (green for achieved, red for not achieved).

#### Mobile Incentives
- **Mobile Order Incentive**: Shows number of orders created via mobile and incentive amount
- **Mobile Cash Recovery Incentive**: Shows amount recovered via mobile and incentive amount

#### Brand Incentives
- Displays each brand item with target quantity, achieved quantity, and incentive amount
- Only shown if brand incentives exist

#### Bonuses
- Displays all applicable bonuses (Eid Fitr, Eid Adha, Other)
- Shows bonus type, detail, and amount

#### Totals
- **Gross Salary**: Sum of all components before deductions
- **Deductions**: Tax, Advance, Loan, Other
- **Net Salary**: Final salary after deductions (highlighted in green)

### 3. Print Salary Sheet
- Generates a professional, printable salary sheet
- Includes all calculation details
- Formatted for A4 printing
- Achievement badges for target-based incentives
- Color-coded sections for easy reading

## Usage

### Navigation
Access the component via:
- Route: `/salary/calculate`
- Sidebar: "Calculate Salary" menu item

### Workflow
1. Select an employee from the dropdown
2. Select the month and year for calculation
3. Click "Calculate Salary" button
4. Review the detailed breakdown
5. Click "Print Salary Sheet" to generate printable version

## API Integration

### Calculate Salary
- **Endpoint**: `POST /api/v1/salary/calculate`
- **Request Body**:
  ```json
  {
    "employeeId": "string",
    "month": "string",
    "year": number
  }
  ```
- **Response**: Complete salary calculation with all components

### Get Employees
- **Endpoint**: `GET /api/v1/accounts?accountType=Employee`
- **Response**: List of active employees

## Component Structure

### Files
- `salary-calculation.component.ts`: Component logic
- `salary-calculation.component.html`: Template
- `salary-calculation.component.scss`: Styles
- `salary-calculation.component.spec.ts`: Unit tests

### Dependencies
- `SalaryCalculationService`: Handles API calls for salary calculation
- `SalaryPackageService`: Fetches employee list
- `ToastService`: Displays success/error messages

### Models
- `SalaryCalculation`: Main calculation model
- `SalaryCalculationRequest`: API request model
- `Employee`: Employee model from salary package

## Styling

### Responsive Design
- Desktop: Multi-column grid layout
- Tablet: Adjusted grid columns
- Mobile: Single column layout

### Color Coding
- **Green**: Achieved targets, net salary
- **Red**: Not achieved targets, deductions
- **Blue**: Gross salary, incentive cards
- **Orange**: Brand incentives

### Visual Elements
- Achievement badges for targets
- Color-coded sections
- Professional card-based layout
- Clear typography hierarchy

## Testing

### Unit Tests
- Component creation
- Form initialization with current month/year
- Form validation
- Currency formatting

### Manual Testing
1. Verify employee dropdown loads correctly
2. Test calculation with different employees
3. Verify all components display correctly
4. Test print functionality
5. Verify responsive layout on different screen sizes

## Future Enhancements
- Export to PDF functionality
- Email salary sheet to employee
- Comparison with previous months
- Salary history view
- Bulk calculation for all employees
