import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <div class="sidebar-header">
      <div class="logo-container">
        <div class="logo-icon">
          <mat-icon>local_pharmacy</mat-icon>
        </div>
        <div class="logo-text">
          <span class="brand">Indus</span><span class="sub">traders</span>
        </div>
      </div>
    </div>

    <mat-nav-list class="sidebar-nav">
      <!-- Dashboard - Always visible -->
      <a mat-list-item routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
        <mat-icon matListItemIcon>dashboard</mat-icon>
        <span matListItemTitle>Dashboard</span>
      </a>

      <!-- Admin/Manager Section -->
      <ng-container *ngIf="isAdmin">

        <!-- Inventory Section -->
        <div class="menu-section">
          <div class="section-header" (click)="toggleSection('inventory')"
               [class.active]="isRouteActive(['/items', '/batches', '/inventory'])">
            <mat-icon class="section-icon">inventory_2</mat-icon>
            <span class="section-title">Inventory</span>
            <mat-icon class="expand-icon" [class.expanded]="expandedSections['inventory']">
              chevron_right
            </mat-icon>
          </div>
          <div class="submenu" [class.open]="expandedSections['inventory']">
            <a mat-list-item routerLink="/items" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>category</mat-icon>
              <span matListItemTitle>Items</span>
            </a>
            <a mat-list-item routerLink="/batches" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>qr_code</mat-icon>
              <span matListItemTitle>Batches / Purchase</span>
            </a>
            <a mat-list-item routerLink="/inventory/stock-levels" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>inventory</mat-icon>
              <span matListItemTitle>Stock Overview</span>
            </a>
            <a mat-list-item routerLink="/inventory/stock-adjustment" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>tune</mat-icon>
              <span matListItemTitle>Stock Adjustment</span>
            </a>
            <a mat-list-item routerLink="/inventory/physical-count" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>fact_check</mat-icon>
              <span matListItemTitle>Physical Count</span>
            </a>
          </div>
        </div>

        <!-- Warehouses Section -->
        <div class="menu-section">
          <div class="section-header" (click)="toggleSection('warehouses')"
               [class.active]="isRouteActive(['/warehouses', '/inventory/stock-transfer'])">
            <mat-icon class="section-icon">warehouse</mat-icon>
            <span class="section-title">Warehouses</span>
            <mat-icon class="expand-icon" [class.expanded]="expandedSections['warehouses']">
              chevron_right
            </mat-icon>
          </div>
          <div class="submenu" [class.open]="expandedSections['warehouses']">
            <a mat-list-item routerLink="/warehouses" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>store</mat-icon>
              <span matListItemTitle>Manage Warehouses</span>
            </a>
            <a mat-list-item routerLink="/inventory/stock-transfer" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>swap_horiz</mat-icon>
              <span matListItemTitle>Stock Transfer</span>
            </a>
          </div>
        </div>

        <!-- Sales Section -->
        <div class="menu-section">
          <div class="section-header" (click)="toggleSection('sales')"
               [class.active]="isRouteActive(['/sales-invoices', '/sales-returns', '/salesman/returns'])">
            <mat-icon class="section-icon">point_of_sale</mat-icon>
            <span class="section-title">Sales</span>
            <mat-icon class="expand-icon" [class.expanded]="expandedSections['sales']">
              chevron_right
            </mat-icon>
          </div>
          <div class="submenu" [class.open]="expandedSections['sales']">
            <a mat-list-item routerLink="/sales-invoices" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>receipt</mat-icon>
              <span matListItemTitle>Sales List</span>
            </a>
            <a mat-list-item routerLink="/sales-returns" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>assignment_return</mat-icon>
              <span matListItemTitle>Returns</span>
            </a>
          </div>
        </div>

        <!-- Purchase Section -->
        <div class="menu-section">
          <div class="section-header" (click)="toggleSection('purchase')"
               [class.active]="isRouteActive(['/purchase-invoices', '/suppliers'])">
            <mat-icon class="section-icon">shopping_bag</mat-icon>
            <span class="section-title">Purchase</span>
            <mat-icon class="expand-icon" [class.expanded]="expandedSections['purchase']">
              chevron_right
            </mat-icon>
          </div>
          <div class="submenu" [class.open]="expandedSections['purchase']">
            <a mat-list-item routerLink="/purchase-invoices" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>receipt_long</mat-icon>
              <span matListItemTitle>Purchase Invoices</span>
            </a>
            <a mat-list-item routerLink="/suppliers" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>local_shipping</mat-icon>
              <span matListItemTitle>Suppliers</span>
            </a>
          </div>
        </div>

        <!-- Users Section -->
        <div class="menu-section">
          <div class="section-header" (click)="toggleSection('users')"
               [class.active]="isRouteActive(['/users', '/customers'])">
            <mat-icon class="section-icon">people</mat-icon>
            <span class="section-title">Users</span>
            <mat-icon class="expand-icon" [class.expanded]="expandedSections['users']">
              chevron_right
            </mat-icon>
          </div>
          <div class="submenu" [class.open]="expandedSections['users']">
            <a mat-list-item routerLink="/users" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
              <span matListItemTitle>User Management</span>
            </a>
            <a mat-list-item routerLink="/customers" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>person</mat-icon>
              <span matListItemTitle>Customers</span>
            </a>
          </div>
        </div>

        <!-- Master Data - Simplified -->
        <a mat-list-item routerLink="/master-data" routerLinkActive="active">
          <mat-icon matListItemIcon>dataset</mat-icon>
          <span matListItemTitle>Master Data</span>
        </a>


        <!-- Accounts Section -->
        <div class="menu-section">
          <div class="section-header" (click)="toggleSection('accounts')"
               [class.active]="isRouteActive(['/accounts', '/chart-of-accounts', '/account-registration'])">
            <mat-icon class="section-icon">account_balance</mat-icon>
            <span class="section-title">Accounts</span>
            <mat-icon class="expand-icon" [class.expanded]="expandedSections['accounts']">
              chevron_right
            </mat-icon>
          </div>
          <div class="submenu" [class.open]="expandedSections['accounts']">
            <a mat-list-item routerLink="/accounts" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>account_balance_wallet</mat-icon>
              <span matListItemTitle>Chart of Accounts</span>
            </a>
            <a mat-list-item routerLink="/account-registration" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>person_add</mat-icon>
              <span matListItemTitle>Account Registration</span>
            </a>
          </div>
        </div>

        <!-- Expenses Section -->
        <div class="menu-section">
          <div class="section-header" (click)="toggleSection('expenses')"
               [class.active]="isRouteActive(['/expenses', '/investors', '/tax-config', '/salary'])">
            <mat-icon class="section-icon">account_balance_wallet</mat-icon>
            <span class="section-title">Expenses</span>
            <mat-icon class="expand-icon" [class.expanded]="expandedSections['expenses']">
              chevron_right
            </mat-icon>
          </div>
          <div class="submenu" [class.open]="expandedSections['expenses']">
            <a mat-list-item routerLink="/expenses" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="submenu-item">
              <mat-icon matListItemIcon>account_balance_wallet</mat-icon>
              <span matListItemTitle>Expenses</span>
            </a>
            <a mat-list-item routerLink="/investors" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="submenu-item">
              <mat-icon matListItemIcon>savings</mat-icon>
              <span matListItemTitle>Investors</span>
            </a>
            <a mat-list-item routerLink="/investors/profit-share" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="submenu-item">
              <mat-icon matListItemIcon>pie_chart</mat-icon>
              <span matListItemTitle>Profit Share</span>
            </a>
            <a mat-list-item routerLink="/tax-config" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="submenu-item">
              <mat-icon matListItemIcon>receipt_long</mat-icon>
              <span matListItemTitle>Tax Config</span>
            </a>
            <a mat-list-item routerLink="/salary-packages" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="submenu-item">
              <mat-icon matListItemIcon>payments</mat-icon>
              <span matListItemTitle>Salary Packages</span>
            </a>
            <a mat-list-item routerLink="/salary/calculate" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="submenu-item">
              <mat-icon matListItemIcon>calculate</mat-icon>
              <span matListItemTitle>Calculate Salary</span>
            </a>
          </div>
        </div>

        <!-- Operations Section -->
        <div class="menu-section">
          <div class="section-header" (click)="toggleSection('operations')"
               [class.active]="isRouteActive(['/bilty', '/route-plans', '/recovery-summary', '/letters', '/e-orders', '/quotations', '/pdc', '/cashbook', '/cash-adjustment', '/schemes', '/capital'])">
            <mat-icon class="section-icon">local_shipping</mat-icon>
            <span class="section-title">Operations</span>
            <mat-icon class="expand-icon" [class.expanded]="expandedSections['operations']">
              chevron_right
            </mat-icon>
          </div>
          <div class="submenu" [class.open]="expandedSections['operations']">
            <a mat-list-item routerLink="/quotations" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>request_quote</mat-icon>
              <span matListItemTitle>Quotations</span>
            </a>
            <a mat-list-item routerLink="/e-orders" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>shopping_cart</mat-icon>
              <span matListItemTitle>E-Orders</span>
            </a>
            <a mat-list-item routerLink="/route-plans" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>map</mat-icon>
              <span matListItemTitle>Route Plans</span>
            </a>
            <a mat-list-item routerLink="/bilty" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>description</mat-icon>
              <span matListItemTitle>Bilty</span>
            </a>
            <a mat-list-item routerLink="/recovery-summary" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>summarize</mat-icon>
              <span matListItemTitle>Recovery Summary</span>
            </a>
            <a mat-list-item routerLink="/targets/dashboard" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>track_changes</mat-icon>
              <span matListItemTitle>Target Dashboard</span>
            </a>
            <a mat-list-item routerLink="/schemes" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>percent</mat-icon>
              <span matListItemTitle>Schemes &amp; Claims</span>
            </a>
            <a mat-list-item routerLink="/cashbook" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>account_balance_wallet</mat-icon>
              <span matListItemTitle>Cash Book</span>
            </a>
            <a mat-list-item routerLink="/cash-adjustment" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>swap_horiz</mat-icon>
              <span matListItemTitle>Cash Adjustment</span>
            </a>
            <a mat-list-item routerLink="/pdc" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>account_balance</mat-icon>
              <span matListItemTitle>Post-Dated Cheques</span>
            </a>
            <a mat-list-item routerLink="/capital" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>account_balance_wallet</mat-icon>
              <span matListItemTitle>Capital Assets</span>
            </a>
            <a mat-list-item routerLink="/letters" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>mail</mat-icon>
              <span matListItemTitle>Letters</span>
            </a>
          </div>
        </div>

      </ng-container>

      <!-- Salesman Only Section -->
      <ng-container *ngIf="isSalesman && !isAdmin">
        <a mat-list-item routerLink="/salesman/pos" routerLinkActive="active">
          <mat-icon matListItemIcon>point_of_sale</mat-icon>
          <span matListItemTitle>POS</span>
        </a>
        <a mat-list-item routerLink="/sales-invoices" routerLinkActive="active">
          <mat-icon matListItemIcon>receipt</mat-icon>
          <span matListItemTitle>Sales Invoices</span>
        </a>
        <a mat-list-item routerLink="/salesman/returns" routerLinkActive="active">
          <mat-icon matListItemIcon>assignment_return</mat-icon>
          <span matListItemTitle>Sales Returns</span>
        </a>
        <a mat-list-item routerLink="/items" routerLinkActive="active">
          <mat-icon matListItemIcon>inventory_2</mat-icon>
          <span matListItemTitle>Items</span>
        </a>
      </ng-container>

    </mat-nav-list>
  `,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() closeSidebar = new EventEmitter<void>();
  userCount = 0;
  userRole: string | null = null;
  private destroy$ = new Subject<void>();

  expandedSections: { [key: string]: boolean } = {
    inventory: false,
    warehouses: false,
    sales: false,
    purchase: false,
    users: false,
    accounts: false,
    expenses: false,
    operations: false,
    masterData: false
  };
  currentTab: string = '';

  get isAdmin(): boolean {
    const user = this.authService.currentUserValue;
    return user?.role === 'admin' || user?.role === 'manager';
  }

  get isSalesman(): boolean {
    const user = this.authService.currentUserValue;
    return user?.role === 'sales' || user?.role === 'salesman';
  }

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.expandSectionForRoute(event.urlAfterRedirects);
      this.updateCurrentTab();
    });

    this.expandSectionForRoute(this.router.url);
    this.updateCurrentTab();
  }

  private updateCurrentTab(): void {
    const urlTree = this.router.parseUrl(this.router.url);
    this.currentTab = urlTree.queryParams['tab'] || '';
  }

  toggleSection(section: string): void {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  isRouteActive(routes: string[]): boolean {
    return routes.some(route => this.router.url.includes(route));
  }

  isTabActive(tab: string): boolean {
    return this.router.url.includes('/master-data') && this.currentTab === tab;
  }

  private expandSectionForRoute(url: string): void {
    if (url.includes('/items') || url.includes('/batches') || url.includes('/inventory')) {
      this.expandedSections['inventory'] = true;
    }
    if (url.includes('/warehouses') || url.includes('/stock-transfer')) {
      this.expandedSections['warehouses'] = true;
    }
    if (url.includes('/sales-invoices') || url.includes('/sales-returns') || url.includes('/salesman/returns')) {
      this.expandedSections['sales'] = true;
    }
    if (url.includes('/purchase') || url.includes('/suppliers')) {
      this.expandedSections['purchase'] = true;
    }
    if (url.includes('/users') || url.includes('/customers')) {
      this.expandedSections['users'] = true;
    }
    if (url.includes('/master-data')) {
      this.expandedSections['masterData'] = true;
    }
    if (url.includes('/accounts') || url.includes('/chart-of-accounts') || url.includes('/account-registration')) {
      this.expandedSections['accounts'] = true;
    }
    if (url.includes('/expenses') || url.includes('/investors') || url.includes('/tax') || url.includes('/salary')) {
      this.expandedSections['expenses'] = true;
    }
    if (url.includes('/bilty') || url.includes('/route') || url.includes('/recovery') || url.includes('/letters') || url.includes('/targets') || url.includes('/e-orders') || url.includes('/quotations') || url.includes('/pdc') || url.includes('/cashbook') || url.includes('/cash-adjustment') || url.includes('/schemes') || url.includes('/capital')) {
      this.expandedSections['operations'] = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
