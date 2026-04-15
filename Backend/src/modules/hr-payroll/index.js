/**
 * HR & Payroll Module
 * Manages human resources: Employees, Salaries, Attendance
 */

module.exports = {
  name: 'hr-payroll',
  version: '1.0.0',
  description: 'Human resources and payroll management',
  
  // Controllers
  controllers: {
    employees: require('./controllers/employee.controller'),
    salaryPackages: require('./controllers/salaryPackage.controller'),
    salaryCalculations: require('./controllers/salaryCalculation.controller'),
    salarySheets: require('./controllers/salarySheet.controller'),
    attendance: require('./controllers/attendance.controller'),
    letters: require('./controllers/letter.controller'),
  },
  
  // Services
  services: {
    employees: require('./services/employee.service'),
    salaryPackages: require('./services/salaryPackage.service'),
    salaryCalculations: require('./services/salaryCalculation.service'),
    salarySheets: require('./services/salarySheet.service'),
    attendance: require('./services/attendance.service'),
  },
  
  // Routes
  routes: require('./routes/hrPayroll.routes'),
  
  // Module metadata
  dependencies: ['auth', 'master-data'],
  models: [
    'SalaryPackage',
    'SalaryCalculation',
    'SalarySheet',
    'Letter',
    'Salesman',
    'Designation',
  ],
};
