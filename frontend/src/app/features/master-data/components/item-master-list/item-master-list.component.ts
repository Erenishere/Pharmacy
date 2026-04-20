import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ItemMasterService, Item, ItemFilters } from '../../services/item-master.service';
import { CompanyMasterService, Company } from '../../services/company-master.service';
import { SupportingMasterService, Category, BusinessType } from '../../services/supporting-master.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ItemMasterFormComponent } from '../item-master-form/item-master-form.component';
import { ItemMasterDetailComponent } from '../item-master-detail/item-master-detail.component';
import { DataTableColumn, TableActionClickEvent } from '../../../../shared/models/data-table.model';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';


@Component({
  selector: 'app-item-master-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    DataTableComponent
  ],
  templateUrl: './item-master-list.component.html',
  styleUrl: './item-master-list.component.scss'
})
export class ItemMasterListComponent implements OnInit {
  items: Item[] = [];
  companies: Company[] = [];
  categories: Category[] = [];
  businessTypes: BusinessType[] = [];
  
  totalItems = 0;
  pageSize = 25;
  currentPage = 0;
  loading = false;

  filters: ItemFilters = {
    search: '',
    companyId: '',
    categoryId: '',
    sellingGroup: '',
    businessTypeId: '',
    isActive: true,
    page: 1,
    limit: 25
  };

  tableColumns: DataTableColumn[] = [
    { key: 'code', label: 'Code', sortable: true, getCellClass: (row: any) => 'code-cell' },
    { key: 'name', label: 'Item Name', sortable: true, getCellClass: (row: any) => 'name-cell' },
    { key: 'company', label: 'Company', getValue: (row: any) => row.companyId?.name || 'N/A' },
    { key: 'category', label: 'Category', getValue: (row: any) => row.categoryId?.name || 'N/A' },
    { key: 'retailPrice', label: 'Retail', getValue: (row: any) => row.pricing?.retailPrice?.toFixed(2) || '0.00', getCellClass: (row: any) => 'amount-cell' },
    { key: 'tradePrice', label: 'Trade', getValue: (row: any) => row.pricing?.tradePrice?.toFixed(2) || '0.00', getCellClass: (row: any) => 'amount-cell' },
    { key: 'stock', label: 'Stock', getValue: (row: any) => row.inventory?.currentStock || 0, getCellClass: (row: any) => `stock-cell ${this.getStockStatusClass(row)}` },
    { key: 'status', label: 'Status', getValue: (row: any) => row.isActive ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'visibility', label: 'View', actionKey: 'view' },
      { icon: 'edit', label: 'Edit', actionKey: 'edit' },
      { icon: 'sync_alt', label: 'Toggle', actionKey: 'toggle' }
    ]}
  ];

  constructor(
    private itemService: ItemMasterService,
    private companyService: CompanyMasterService,
    private supportingService: SupportingMasterService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadMasterData();
    this.loadItems();
  }

  loadMasterData() {
    this.companyService.getCompanies({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success) {
          this.companies = response.data;
        }
      },
      error: (err) => console.error('Error loading companies', err)
    });

    this.supportingService.getCategories({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success) {
          this.categories = response.data;
        }
      },
      error: (err) => console.error('Error loading categories', err)
    });

    this.supportingService.getBusinessTypes({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success) {
          this.businessTypes = response.data;
        }
      },
      error: (err) => console.error('Error loading business types', err)
    });
  }

  loadItems() {
    this.loading = true;
    this.filters.page = this.currentPage + 1;
    this.filters.limit = this.pageSize;

    this.itemService.getItems(this.filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.items = response.data;
          this.totalItems = response.pagination?.totalItems || response.data.length;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading items', err);
        this.toastService.error('Failed to load items');
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.currentPage = 0;
    this.loadItems();
  }

  onFilterChange() {
    this.currentPage = 0;
    this.loadItems();
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadItems();
  }

  addItem() {
    const dialogRef = this.dialog.open(ItemMasterFormComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadItems();
      }
    });
  }

  viewItem(item: Item) {
    this.dialog.open(ItemMasterDetailComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { item }
    });
  }

  editItem(item: Item) {
    const dialogRef = this.dialog.open(ItemMasterFormComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { mode: 'edit', item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadItems();
      }
    });
  }

  onTableAction(event: TableActionClickEvent): void {
    const row = event.row as Item;
    switch(event.action) {
      case 'view': this.viewItem(row); break;
      case 'edit': this.editItem(row); break;
      case 'toggle': this.toggleStatus(row); break;
    }
  }

  toggleStatus(item: Item) {
    this.itemService.toggleItemStatus(item._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(`Item status updated successfully`);
          this.loadItems();
        }
      },
      error: (err) => {
        console.error('Error toggling status', err);
        this.toastService.error('Failed to update item status');
      }
    });
  }

  exportToExcel() {
    this.itemService.exportItems('excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `items_${new Date().getTime()}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.success('Items exported successfully');
      },
      error: (err) => {
        console.error('Error exporting items', err);
        this.toastService.error('Failed to export items');
      }
    });
  }

  exportToPDF() {
    this.itemService.exportItems('pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `items_${new Date().getTime()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.success('Items exported successfully');
      },
      error: (err) => {
        console.error('Error exporting items', err);
        this.toastService.error('Failed to export items');
      }
    });
  }

  refreshItems() {
    this.loadItems();
  }

  getStockStatusClass(item: Item): string {
    const current = item.inventory?.currentStock || 0;
    const min = item.inventory?.minStockLevel || 0;
    const max = item.inventory?.maxStockLevel || 0;

    if (current === 0) return 'stock-out';
    if (current <= min) return 'stock-low';
    if (max > 0 && current >= max) return 'stock-over';
    return 'stock-normal';
  }

  getCompanyName(companyId: string): string {
    const company = this.companies.find(c => c._id === companyId);
    return company?.name || 'N/A';
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c._id === categoryId);
    return category?.name || 'N/A';
  }
}
