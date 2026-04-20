import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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
    private route: ActivatedRoute
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
        this.currentTab = 'company-groups';
        this.loadCompanyGroups();
      }
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
