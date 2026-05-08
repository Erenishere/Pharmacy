import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { SupportingMasterService } from '../../services/supporting-master.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { MasterDataFormDialogComponent } from '../master-data-form-dialog/master-data-form-dialog.component';
import { DataTableColumn, TableActionClickEvent } from '../../../../shared/models/data-table.model';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';


@Component({
  selector: 'app-supporting-master-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatDialogModule,
    MatChipsModule,
    DataTableComponent
  ],
  templateUrl: './supporting-master-list.component.html',
  styles: [`
    @import 'styles/shared-list-styles';
    
    .list-page-container {
      @include page-container;
    }

    .list-page-header {
      @include page-header;
    }

    .list-page-card {
      @include list-card;
      overflow: hidden;
    }

    .metadata-nav-card {
      @include list-card;
      margin-bottom: 22px;
      padding: 22px;
    }

    .metadata-nav-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;

      h2 {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0;
        color: var(--indus-text, #5e5873);
        font-size: 20px;
        font-weight: 800;

        mat-icon {
          color: var(--indus-primary, #7367f0);
        }
      }

      p {
        margin: 4px 0 0;
        color: var(--indus-text-soft, #6e6b7b);
        font-size: 14px;
        font-weight: 500;
      }
    }

    .metadata-tab-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    .metadata-tab {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 10px 14px;
      border: 1px solid var(--indus-border, #ebe9f1);
      border-radius: var(--indus-radius-sm, 8px);
      background: var(--indus-surface, #fff);
      color: var(--indus-text, #5e5873);
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 800;
      text-align: left;
      transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease, transform 160ms ease;

      mat-icon {
        flex: 0 0 28px;
        width: 28px;
        height: 28px;
        color: var(--indus-primary, #7367f0);
        font-size: 22px;
      }

      &:hover {
        border-color: var(--indus-hover-border, rgba(115, 103, 240, 0.18));
        background: var(--indus-primary-softer, rgba(115, 103, 240, 0.05));
        box-shadow: var(--indus-hover-shadow, 0 12px 28px rgba(115, 103, 240, 0.12));
        transform: translateY(-1px);
      }

      &.active {
        border-color: var(--indus-primary, #7367f0);
        background: linear-gradient(135deg, var(--indus-primary, #7367f0) 0%, var(--indus-primary-dark, #5e50ee) 100%);
        color: var(--indus-white, #fff);
        box-shadow: var(--indus-shadow-button, 0 8px 18px rgba(115, 103, 240, 0.28));

        mat-icon {
          color: var(--indus-white, #fff);
        }
      }
    }

    .table-actions {
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ebe9f1;

      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #5e5873;
        display: flex;
        align-items: center;
        gap: 8px;

        mat-icon {
          color: #7367f0;
        }
      }
    }

    @media (max-width: 768px) {
      .metadata-nav-card {
        padding: 16px;
      }

      .metadata-nav-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .metadata-tab-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SupportingMasterListComponent implements OnInit {

  public transporters: any[] = [];
  public claimAccounts: any[] = [];
  public dimensions: any[] = [];
  public salesmen: any[] = [];
  public accountHeads: any[] = [];
  public schemes: any[] = [];
  public towns: any[] = [];
  public areas: any[] = [];
  public customerTypes: any[] = [];
  public designations: any[] = [];
  public companies: any[] = [];
  public companyGroups: any[] = [];
  public formulas: any[] = [];
  public formulaSizes: any[] = [];
  public categories: any[] = [];
  public subCategories: any[] = [];
  public businessTypes: any[] = [];

  currentTab: string = 'transporters';

  readonly metadataTabs = [
    { key: 'transporters', label: 'Transporters', icon: 'local_shipping' },
    { key: 'claim-accounts', label: 'Claim Accounts', icon: 'account_balance' },
    { key: 'dimensions', label: 'Dimensions', icon: 'layers' },
    { key: 'salesmen', label: 'Sales Force', icon: 'person' },
    { key: 'account-heads', label: 'Account Heads', icon: 'summarize' },
    { key: 'schemes', label: 'Schemes', icon: 'percent' },
    { key: 'towns', label: 'Towns', icon: 'location_city' },
    { key: 'areas', label: 'Areas', icon: 'map' },
    { key: 'customer-types', label: 'Customer Types', icon: 'groups' },
    { key: 'companies', label: 'Companies', icon: 'business' },
    { key: 'company-groups', label: 'Corporate Groups', icon: 'corporate_fare' },
    { key: 'formulas', label: 'Formulas', icon: 'science' },
    { key: 'formula-sizes', label: 'Formula Sizes', icon: 'straighten' },
    { key: 'categories', label: 'Categories', icon: 'category' },
    { key: 'sub-categories', label: 'Sub-Categories', icon: 'segment' },
    { key: 'business-types', label: 'Business Types', icon: 'store' }
  ];

  private tabMapping: { [key: string]: boolean } = {
    'transporters': true,
    'claim-accounts': true,
    'dimensions': true,
    'salesmen': true,
    'account-heads': true,
    'schemes': true,
    'towns': true,
    'areas': true,
    'customer-types': true,
    'companies': true,
    'company-groups': true,
    'formulas': true,
    'formula-sizes': true,
    'categories': true,
    'sub-categories': true,
    'business-types': true
  };

  // ── Column Definitions ───────────────────────────────────
  transporterCols: DataTableColumn[] = [
    { key: 'code', label: 'Code', getCellClass: (row: any) => 'code-cell' },
    { key: 'name', label: 'Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'contact', label: 'Contact', getValue: (row: any) => row.contactPerson || 'N/A' },
    { key: 'phone', label: 'Phone', getValue: (row: any) => row.phone || 'N/A' },
    { key: 'status', label: 'Status', getValue: (row: any) => row.isActive ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  claimAccountCols: DataTableColumn[] = [
    { key: 'name', label: 'Account Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'status', label: 'Status', getValue: (row: any) => row.isActive ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  dimensionCols: DataTableColumn[] = [
    { key: 'code', label: 'Code', getCellClass: (row: any) => 'code-cell' },
    { key: 'name', label: 'Dimension Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'type', label: 'Type', getValue: (row: any) => this.formatDimensionType(row.type) },
    { key: 'parent', label: 'Parent Location', getValue: (row: any) => row.parentDimensionId?.code ? (row.parentDimensionId.code + ' - ' + row.parentDimensionId.name) : 'Root' },
    { key: 'status', label: 'Status', getValue: (row: any) => row.isActive ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  salesmanCols: DataTableColumn[] = [
    { key: 'code', label: 'Code', getCellClass: (row: any) => 'code-cell' },
    { key: 'name', label: 'Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'phone', label: 'Phone', getValue: (row: any) => row.phone || '-' },
    { key: 'cnic', label: 'CNIC', getValue: (row: any) => row.cnic || '-' },
    { key: 'status', label: 'Status', getValue: (row: any) => row.isActive ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  accountHeadCols: DataTableColumn[] = [
    { key: 'code', label: 'Code', getCellClass: (row: any) => 'code-cell' },
    { key: 'name', label: 'Head Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'type', label: 'Head Type' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  schemeCols: DataTableColumn[] = [
    { key: 'name', label: 'Scheme Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  townCols: DataTableColumn[] = [
    { key: 'name', label: 'Town Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'region', label: 'Region', getValue: (row: any) => row.region || '-' },
    { key: 'status', label: 'Status', getValue: (row: any) => row.isActive ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  areaCols: DataTableColumn[] = [
    { key: 'name', label: 'Area Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'town', label: 'Town', getValue: (row: any) => row.townId?.name || '-' },
    { key: 'status', label: 'Status', getValue: (row: any) => row.isActive ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  customerTypeCols: DataTableColumn[] = [
    { key: 'name', label: 'Type Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  companyCols: DataTableColumn[] = [
    { key: 'code', label: 'Code', getCellClass: (row: any) => 'code-cell' },
    { key: 'name', label: 'Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'groupType', label: 'Group Type', getValue: (row: any) => row.groupType || '-' },
    { key: 'status', label: 'Status', getValue: (row: any) => row.isActive ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  companyGroupCols: DataTableColumn[] = [
    { key: 'name', label: 'Group Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'company', label: 'Company', getValue: (row: any) => row.companyId?.name || '-' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  formulaCols: DataTableColumn[] = [
    { key: 'name', label: 'Formula Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'composition', label: 'Composition' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  formulaSizeCols: DataTableColumn[] = [
    { key: 'formula', label: 'Formula', getValue: (row: any) => row.formulaId?.name || '-' },
    { key: 'size', label: 'Size', getCellClass: (row: any) => 'name-cell' },
    { key: 'strength', label: 'Strength', getValue: (row: any) => row.strength || '-' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  categoryCols: DataTableColumn[] = [
    { key: 'name', label: 'Category Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  subCategoryCols: DataTableColumn[] = [
    { key: 'category', label: 'Category', getValue: (row: any) => row.categoryId?.name || '-' },
    { key: 'name', label: 'Sub Category', getCellClass: (row: any) => 'name-cell' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  businessTypeCols: DataTableColumn[] = [
    { key: 'name', label: 'Type Name', getCellClass: (row: any) => 'name-cell' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [{ icon: 'edit', label: 'Edit', actionKey: 'edit' }] }
  ];

  constructor(
    private supportingService: SupportingMasterService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  onTableAction(event: TableActionClickEvent, type: string): void {
    if (event.action === 'edit') this.openForm(type, event.row);
  }


  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && this.tabMapping.hasOwnProperty(tab)) {
        this.currentTab = tab;
        this.loadTabData(tab);
      } else {
        this.currentTab = 'transporters';
        this.loadTransporters();
      }
    });
  }

  selectTab(tab: string): void {
    if (!this.tabMapping[tab] || this.currentTab === tab) {
      return;
    }

    this.currentTab = tab;
    this.loadTabData(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  private loadTabData(tab: string): void {
    switch (tab) {
      case 'transporters': this.loadTransporters(); break;
      case 'claim-accounts': this.loadClaimAccounts(); break;
      case 'dimensions': this.loadDimensions(); break;
      case 'salesmen': this.loadSalesmen(); break;
      case 'account-heads': this.loadAccountHeads(); break;
      case 'schemes': this.loadSchemes(); break;
      case 'towns': this.loadTowns(); break;
      case 'areas': this.loadAreas(); break;
      case 'customer-types': this.loadCustomerTypes(); break;
      case 'companies': this.loadCompanies(); break;
      case 'company-groups': this.loadCompanyGroups(); break;
      case 'formulas': this.loadFormulas(); break;
      case 'formula-sizes': this.loadFormulaSizes(); break;
      case 'categories': this.loadCategories(); break;
      case 'sub-categories': this.loadSubCategories(); break;
      case 'business-types': this.loadBusinessTypes(); break;
    }
  }

  onTabChange(event: any) {
    const label = event.tab.textLabel;
    switch (label) {
      case 'Transporters': this.loadTransporters(); break;
      case 'Claim Accounts': this.loadClaimAccounts(); break;
      case 'Dimensions/Branches': this.loadDimensions(); break;
      case 'Salesmen': this.loadSalesmen(); break;
      case 'Account Heads': this.loadAccountHeads(); break;
      case 'Schemes': this.loadSchemes(); break;
      case 'Towns': this.loadTowns(); break;
      case 'Areas': this.loadAreas(); break;
      case 'Customer Types': this.loadCustomerTypes(); break;
      case 'Designations': this.loadDesignations(); break;
      case 'Companies': this.loadCompanies(); break;
      case 'Company Groups': this.loadCompanyGroups(); break;
      case 'Formulas': this.loadFormulas(); break;
      case 'Formula Sizes': this.loadFormulaSizes(); break;
      case 'Categories': this.loadCategories(); break;
      case 'Sub Categories': this.loadSubCategories(); break;
      case 'Business Types': this.loadBusinessTypes(); break;
    }
  }

  loadTransporters() {
    this.supportingService.getTransporters().subscribe({
      next: (res) => this.transporters = res.data,
      error: () => this.toastService.error('Failed to load transporters')
    });
  }

  loadClaimAccounts() {
    this.supportingService.getClaimAccounts().subscribe({
      next: (res) => this.claimAccounts = res.data,
      error: () => this.toastService.error('Failed to load claim accounts')
    });
  }

  loadDimensions() {
    this.supportingService.getDimensions({ limit: 1000 }).subscribe({
      next: (res) => this.dimensions = res.data,
      error: () => this.toastService.error('Failed to load dimensions')
    });
  }

  formatDimensionType(type?: string): string {
    if (!type) {
      return 'Branch';
    }

    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  loadSalesmen() {
    this.supportingService.getSalesmen().subscribe({
      next: (res: any) => this.salesmen = res.data?.salesmen || res.data || [],
      error: () => this.toastService.error('Failed to load salesmen')
    });
  }


  loadAccountHeads() {
    this.supportingService.getAccountHeads().subscribe({
      next: (res) => this.accountHeads = res.data,
      error: () => this.toastService.error('Failed to load account heads')
    });
  }

  loadSchemes() {
    this.supportingService.getSchemes().subscribe({
      next: (res) => this.schemes = res.data,
      error: () => this.toastService.error('Failed to load schemes')
    });
  }

  loadTowns() {
    this.supportingService.getTowns().subscribe({
      next: (res) => this.towns = res.data,
      error: () => this.toastService.error('Failed to load towns')
    });
  }

  loadAreas() {
    this.supportingService.getAreas().subscribe({
      next: (res) => this.areas = res.data,
      error: () => this.toastService.error('Failed to load areas')
    });
  }

  loadCustomerTypes() {
    this.supportingService.getCustomerTypes().subscribe({
      next: (res) => this.customerTypes = res.data,
      error: () => this.toastService.error('Failed to load customer types')
    });
  }

  loadDesignations() {
    this.supportingService.getDesignations().subscribe({
      next: (res) => this.designations = res.data,
      error: () => this.toastService.error('Failed to load designations')
    });
  }

  loadCompanies() {
    this.supportingService.getCompanies().subscribe({
      next: (res) => this.companies = res.data,
      error: () => this.toastService.error('Failed to load companies')
    });
  }

  loadCompanyGroups() {
    this.supportingService.getCompanyGroups().subscribe({
      next: (res) => this.companyGroups = res.data,
      error: () => this.toastService.error('Failed to load company groups')
    });
  }

  loadFormulas() {
    this.supportingService.getFormulas().subscribe({
      next: (res) => this.formulas = res.data,
      error: () => this.toastService.error('Failed to load formulas')
    });
  }

  loadFormulaSizes() {
    this.supportingService.getFormulaSizes().subscribe({
      next: (res) => this.formulaSizes = res.data,
      error: () => this.toastService.error('Failed to load formula sizes')
    });
  }

  loadCategories() {
    this.supportingService.getCategories().subscribe({
      next: (res) => this.categories = res.data,
      error: () => this.toastService.error('Failed to load categories')
    });
  }

  loadSubCategories() {
    this.supportingService.getSubCategories().subscribe({
      next: (res) => this.subCategories = res.data,
      error: () => this.toastService.error('Failed to load subcategories')
    });
  }

  loadBusinessTypes() {
    this.supportingService.getBusinessTypes().subscribe({
      next: (res) => this.businessTypes = res.data,
      error: () => this.toastService.error('Failed to load business types')
    });
  }

  openForm(type: string, item?: any) {
    let title = '';
    let fields: string[] = ['name'];

    switch (type) {
      case 'transporter':
        title = 'Transporter';
        fields = ['code', 'name', 'contactPerson', 'phone'];
        break;
      case 'claim-account':
        title = 'Claim Account';
        fields = ['name'];
        break;
      case 'dimension':
        title = 'Dimension Branch Location';
        fields = ['code', 'name', 'type', 'parentDimensionId', 'description'];
        break;
      case 'salesman':
        title = 'Salesman';
        fields = ['name', 'phone', 'cnic', 'fatherName', 'guarantorCnic'];
        break;
      case 'account-head':
        title = 'Account Head';
        fields = ['code', 'name', 'type'];
        break;
      case 'scheme':
        title = 'Scheme';
        fields = [
          'name',
          'companyId',
          'type',
          'group',
          'schemeFormat',
          'discountPercent',
          'claimAccountId',
          'startDate',
          'endDate',
          'minimumQuantity',
          'maximumQuantity',
          'description'
        ];
        break;
      case 'town':
        title = 'Town';
        fields = ['name', 'region'];
        break;
      case 'area':
        title = 'Area';
        fields = ['name', 'townId'];
        break;
      case 'customer-type':
        title = 'Customer Type';
        fields = ['name', 'description'];
        break;
      case 'designation':
        title = 'Designation';
        fields = ['name', 'description'];
        break;
      case 'company':
        title = 'Company';
        fields = ['code', 'name', 'groupType'];
        break;
      case 'company-group':
        title = 'Company Group';
        fields = ['name', 'companyId', 'description'];
        break;
      case 'formula':
        title = 'Formula';
        fields = ['name', 'composition'];
        break;
      case 'formula-size':
        title = 'Formula Size';
        fields = ['formulaId', 'size', 'strength'];
        break;
      case 'category':
        title = 'Category';
        fields = ['name', 'description'];
        break;
      case 'sub-category':
        title = 'Sub Category';
        fields = ['categoryId', 'name', 'description'];
        break;
      case 'business-type':
        title = 'Business Type';
        fields = ['name', 'description'];
        break;
    }

    const dialogRef = this.dialog.open(MasterDataFormDialogComponent, {
      width: '500px',
      data: { type, title, fields, item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshCurrentTab(type);
      }
    });
  }

  refreshCurrentTab(type: string) {
    switch (type) {
      case 'transporter': this.loadTransporters(); break;
      case 'claim-account': this.loadClaimAccounts(); break;
      case 'dimension': this.loadDimensions(); break;
      case 'salesman': this.loadSalesmen(); break;
      case 'account-head': this.loadAccountHeads(); break;
      case 'scheme': this.loadSchemes(); break;
      case 'town': this.loadTowns(); break;
      case 'area': this.loadAreas(); break;
      case 'customer-type': this.loadCustomerTypes(); break;
      case 'designation': this.loadDesignations(); break;
      case 'company': this.loadCompanies(); break;
      case 'company-group': this.loadCompanyGroups(); break;
      case 'formula': this.loadFormulas(); break;
      case 'formula-size': this.loadFormulaSizes(); break;
      case 'category': this.loadCategories(); break;
      case 'sub-category': this.loadSubCategories(); break;
      case 'business-type': this.loadBusinessTypes(); break;
    }
  }
}
