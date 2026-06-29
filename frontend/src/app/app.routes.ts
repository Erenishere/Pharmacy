import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login.component';
import { ForgotPasswordComponent } from './features/auth/components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/components/reset-password/reset-password.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { salesmanGuard } from './core/guards/salesman.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'forgot-password', component: ForgotPasswordComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    {
        path: 'account-registration',
        redirectTo: 'accounts/registration',
        pathMatch: 'full'
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
        children: [
            {
                path: 'dashboard',
                data: { reuse: true },
                loadComponent: () => import('./features/dashboard/components/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./features/users/components/my-profile/my-profile.component').then(m => m.MyProfileComponent)
            },
            {
                path: 'users',
                canActivate: [adminGuard],
                loadComponent: () => import('./features/users/components/user-list/user-list.component').then(m => m.UserListComponent)
            },
            {
                path: 'customers',
                loadComponent: () => import('./features/customers/components/customer-list/customer-list.component').then(m => m.CustomerListComponent)
            },
            {
                path: 'customer',
                redirectTo: 'customers',
                pathMatch: 'full'
            },
            {
                path: 'master-data',
                canActivate: [adminGuard],
                loadComponent: () => import('./features/master-data/components/supporting-master-list/supporting-master-list.component').then(m => m.SupportingMasterListComponent)
            },
            {
                path: 'warehouses',
                canActivate: [adminGuard],
                loadComponent: () => import('./features/warehouses/components/warehouse-list/warehouse-list.component').then(m => m.WarehouseListComponent)
            },
            {
                path: 'suppliers',
                loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent)
            },
            {
                path: 'batches',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/batches/components/batch-list/batch-list.component').then(m => m.BatchListComponent)
                    },
                    {
                        path: 'list',
                        loadComponent: () => import('./features/batches/components/batch-list/batch-list.component').then(m => m.BatchListComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () => import('./features/batches/components/batch-form/batch-form.component').then(m => m.BatchFormComponent)
                    },
                    {
                        path: 'expiring',
                        loadComponent: () => import('./features/batches/components/expiry-tracker/expiry-tracker.component').then(m => m.ExpiryTrackerComponent)
                    },
                    {
                        path: 'statistics',
                        loadComponent: () => import('./features/batches/components/batch-statistics/batch-statistics.component').then(m => m.BatchStatisticsComponent)
                    },
                    {
                        path: 'detail/:id',
                        loadComponent: () => import('./features/batches/components/batch-detail/batch-detail.component').then(m => m.BatchDetailComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/batches/components/batch-form/batch-form.component').then(m => m.BatchFormComponent)
                    },
                    {
                        path: ':id/edit',
                        loadComponent: () => import('./features/batches/components/batch-form/batch-form.component').then(m => m.BatchFormComponent)
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('./features/batches/components/batch-detail/batch-detail.component').then(m => m.BatchDetailComponent)
                    }
                ]
            },
            {
                path: 'purchase-orders',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/purchase-orders/components/purchase-order-list/purchase-order-list.component').then(m => m.PurchaseOrderListComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () => import('./features/purchase-orders/components/create-purchase-order/create-purchase-order.component').then(m => m.CreatePurchaseOrderComponent)
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('./features/purchase-orders/components/purchase-order-detail/purchase-order-detail.component').then(m => m.PurchaseOrderDetailComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/purchase-orders/components/purchase-order-edit/purchase-order-edit.component').then(m => m.PurchaseOrderEditComponent)
                    }
                ]
            },
            {
                path: 'sales-invoices',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/invoices/components/sales-invoice-list/sales-invoice-list.component').then(m => m.SalesInvoiceListComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () => import('./features/invoices/components/create-sales-invoice/create-sales-invoice.component').then(m => m.CreateSalesInvoiceComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/invoices/components/create-sales-invoice/create-sales-invoice.component').then(m => m.CreateSalesInvoiceComponent)
                    }
                ]
            },
            {
                path: 'sales-returns',
                loadComponent: () => import('./features/invoices/components/sales-return/sales-return.component').then(m => m.SalesReturnComponent)
            },
            {
                path: 'purchase-invoices',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/invoices/components/purchase-invoice-list/purchase-invoice-list.component').then(m => m.PurchaseInvoiceListComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () => import('./features/invoices/components/create-purchase-invoice/create-purchase-invoice.component').then(m => m.CreatePurchaseInvoiceComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/invoices/components/create-purchase-invoice/create-purchase-invoice.component').then(m => m.CreatePurchaseInvoiceComponent)
                    },
                    {
                        path: 'return/create',
                        loadComponent: () => import('./features/invoices/components/create-purchase-return/create-purchase-return.component').then(m => m.CreatePurchaseReturnComponent)
                    }
                ]
            },
            {
                path: 'accounts',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/accounts/components/account-list/account-list.component').then(m => m.AccountListComponent)
                    },
                    {
                        path: 'create',
                        redirectTo: 'registration',
                        pathMatch: 'full'
                    },
                    {
                        path: 'registration',
                        loadComponent: () => import('./features/master-data/components/account-registration/account-registration.component').then(m => m.AccountRegistrationComponent)
                    },
                    {
                        path: 'registration/:id',
                        loadComponent: () => import('./features/master-data/components/account-registration/account-registration.component').then(m => m.AccountRegistrationComponent)
                    },
                    {
                        path: 'edit/:id',
                        redirectTo: 'registration/:id'
                    }
                ]
            },
            {
                path: 'items',
                loadComponent: () => import('./features/items/components/item-list-enhanced/item-list-enhanced.component').then(m => m.ItemListEnhancedComponent)
            },
            {
                path: 'item-registration',
                canActivate: [adminGuard],
                loadComponent: () => import('./features/master-data/components/item-registration/item-registration.component').then(m => m.ItemRegistrationComponent)
            },
            {
                path: 'salesman',
                canActivate: [salesmanGuard],
                children: [
                    { path: '', redirectTo: 'pos', pathMatch: 'full' },
                    {
                        path: 'pos',
                        loadComponent: () => import('./features/salesman/components/pos/pos.component').then(m => m.PosComponent)
                    },
                    {
                        path: 'sales-history',
                        loadComponent: () => import('./features/salesman/components/sales-history/sales-history.component').then(m => m.SalesHistoryComponent)
                    },
                    {
                        path: 'commission',
                        loadComponent: () => import('./features/salesman/components/commission/commission.component').then(m => m.CommissionComponent)
                    },
                    {
                        path: 'financial-reports',
                        children: [
                            {
                                path: '',
                                loadComponent: () => import('./features/financial-reports/components/financial-dashboard/financial-dashboard.component').then(m => m.FinancialDashboardComponent)
                            },
                            {
                                path: 'profit-loss',
                                loadComponent: () => import('./features/financial-reports/components/profit-loss/profit-loss.component').then(m => m.ProfitLossComponent)
                            },
                            {
                                path: 'balance-sheet',
                                loadComponent: () => import('./features/financial-reports/components/balance-sheet/balance-sheet.component').then(m => m.BalanceSheetComponent)
                            },
                            {
                                path: 'cash-flow',
                                loadComponent: () => import('./features/financial-reports/components/cash-flow/cash-flow.component').then(m => m.CashFlowComponent)
                            }
                        ]
                    },
                    {
                        path: 'analytics',
                        children: [
                            {
                                path: '',
                                loadComponent: () => import('./features/analytics/components/analytics-dashboard/analytics-dashboard.component').then(m => m.AnalyticsDashboardComponent)
                            }
                        ]
                    },
                    {
                        path: 'returns',
                        loadComponent: () => import('./features/salesman/components/sales-return/sales-return.component').then(m => m.SalesmanSalesReturnComponent)
                    },
                    {
                        path: 'profile',
                        loadComponent: () => import('./features/salesman/components/profile/profile.component').then(m => m.SalesmanProfileComponent)
                    }
                ]
            },
            {
                path: 'salary-packages',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/salary/components/salary-package-list/salary-package-list.component').then(m => m.SalaryPackageListComponent)
                    },
                    {
                        path: 'new',
                        loadComponent: () => import('./features/salary/components/salary-package-form/salary-package-form.component').then(m => m.SalaryPackageFormComponent)
                    },
                    {
                        path: ':id/edit',
                        loadComponent: () => import('./features/salary/components/salary-package-form/salary-package-form.component').then(m => m.SalaryPackageFormComponent)
                    }
                ]
            },
            {
                path: 'salary/calculate',
                loadComponent: () => import('./features/salary/components/salary-calculation/salary-calculation.component').then(m => m.SalaryCalculationComponent)
            },
            {
                path: 'targets/dashboard',
                loadComponent: () => import('./features/salary/components/target-dashboard/target-dashboard.component').then(m => m.TargetDashboardComponent)
            },
            {
                path: 'inventory',
                children: [
                    {
                        path: '',
                        redirectTo: 'stock-levels',
                        pathMatch: 'full'
                    },
                    {
                        path: 'stock-levels',
                        loadComponent: () => import('./features/inventory/components/stock-level-dashboard/stock-level-dashboard.component').then(m => m.StockLevelDashboardComponent)
                    },
                    {
                        path: 'stock-transfer',
                        loadComponent: () => import('./features/inventory/components/stock-transfer/stock-transfer.component').then(m => m.StockTransferComponent)
                    },
                    {
                        path: 'stock-adjustment',
                        loadComponent: () => import('./features/inventory/components/stock-adjustment/stock-adjustment.component').then(m => m.StockAdjustmentComponent)
                    },
                    {
                        path: 'physical-count',
                        loadComponent: () => import('./features/inventory/components/physical-count/physical-count.component').then(m => m.PhysicalCountComponent)
                    }
                ]
            },
            {
                path: 'investors',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/investors/components/investor-list/investor-list.component').then(m => m.InvestorListComponent)
                    },
                    {
                        path: ':id/statement',
                        loadComponent: () => import('./features/investors/components/investor-statement/investor-statement.component').then(m => m.InvestorStatementComponent)
                    },
                    {
                        path: 'profit-share',
                        loadComponent: () => import('./features/investors/components/profit-share/profit-share.component').then(m => m.ProfitShareComponent)
                    }
                ]
            },
            {
                path: 'expenses',
                loadComponent: () => import('./features/expenses/components/expense-list/expense-list.component').then(m => m.ExpenseListComponent)
            },
            {
                path: 'letters',
                loadComponent: () => import('./features/letters/components/letter-list/letter-list.component').then(m => m.LetterListComponent)
            },
            {
                path: 'bilty',
                loadComponent: () => import('./features/bilty/components/bilty-list/bilty-list.component').then(m => m.BiltyListComponent)
            },
            {
                path: 'recovery-summary',
                loadComponent: () => import('./features/recovery-summary/components/recovery-summary/recovery-summary.component').then(m => m.RecoverySummaryComponent)
            },
            {
                path: 'route-plans',
                loadComponent: () => import('./features/route-plan/components/route-plan-list/route-plan-list.component').then(m => m.RoutePlanListComponent)
            },
            {
                path: 'tax-config',
                canActivate: [adminGuard],
                loadComponent: () => import('./features/tax-config/components/tax-config-list/tax-config-list.component').then(m => m.TaxConfigListComponent)
            },
            {
                path: 'e-orders',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/e-orders/components/e-order-list/e-order-list.component').then(m => m.EOrderListComponent)
                    },
                    {
                        path: 'edit/:id',
                        redirectTo: ':id',
                        pathMatch: 'full'
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('./features/e-orders/components/e-order-detail/e-order-detail.component').then(m => m.EOrderDetailComponent)
                    }
                ]
            },
            {
                path: 'quotations',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/quotations/components/quotation-list/quotation-list.component').then(m => m.QuotationListComponent)
                    },
                    {
                        path: 'edit/:id',
                        redirectTo: ':id',
                        pathMatch: 'full'
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('./features/quotations/components/quotation-detail/quotation-detail.component').then(m => m.QuotationDetailComponent)
                    }
                ]
            },
            {
                path: 'pdc',
                loadComponent: () => import('./features/pdc/components/pdc-list/pdc-list.component').then(m => m.PDCListComponent)
            },
            {
                path: 'cashbook',
                loadComponent: () => import('./features/cashbook/components/cashbook.component').then(m => m.CashBookComponent)
            },
            {
                path: 'cash-adjustment',
                loadComponent: () => import('./features/cash-adjustment/components/cash-adjustment-list/cash-adjustment-list.component').then(m => m.CashAdjustmentListComponent)
            },
            {
                path: 'schemes',
                loadComponent: () => import('./features/schemes/components/scheme-list/scheme-list.component').then(m => m.SchemeListComponent)
            },
            {
                path: 'capital',
                loadComponent: () => import('./features/capital/components/capital-list/capital-list.component').then(m => m.CapitalListComponent)
            },
            {
                path: 'salary-sheet',
                canActivate: [adminGuard],
                loadComponent: () => import('./features/payroll/components/salary-sheet/salary-sheet.component').then(m => m.SalarySheetComponent)
            }
        ]
    }
];
