import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ItemService } from '../../services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ItemRegistrationFormComponent } from '../item-form-dialog/item-registration-form.component';
import { DataTableColumn, TableActionClickEvent } from '../../../../shared/models/data-table.model';

import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';


interface ItemDisplay {
  _id: string;
  code: string;
  name: string;
  companyName?: string;
  categoryName?: string;
  genericName?: string;
  supplierName?: string;
  unitPurchaseTP: number;
  unitSaleTP: number;
  unitRetailPrice: number;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  barcode?: string;
  image?: string;
  rawItem?: any;
}

@Component({
  selector: 'app-item-list-enhanced',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatCheckboxModule,
    DataTableComponent
  ],
  templateUrl: './item-list-enhanced.component.html',
  styleUrl: './item-list-enhanced.component.scss'
})
export class ItemListEnhancedComponent implements OnInit {
  tableColumns: DataTableColumn[] = [
    { key: 'serial', label: 'S#', getValue: (row: any) => this.getItemSerial(row) },
    { key: 'companyName', label: 'Company', sortable: true },
    { key: 'name', label: 'Item Name', sortable: true, getValue: (row: any) => row.name + (row.code ? ` (${row.code})` : '') },
    { 
      key: 'currentStock', 
      label: 'Qty', 
      sortable: true, 
      type: 'numeric',
      getCellClass: (row: any) => this.isLowStock(row) ? 'low-stock-text fw-bold' : ''
    },
    { key: 'unitPurchaseTP', label: 'P.Price', type: 'currency', sortable: true },
    { key: 'totalCost', label: 'Total Cost', type: 'currency', getValue: (row: any) => row.currentStock * row.unitPurchaseTP },
    { key: 'unitRetailPrice', label: 'Sale Rate', type: 'currency', sortable: true },
    { key: 'categoryName', label: 'Category', sortable: true },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'visibility', label: 'View', actionKey: 'view' },
      { icon: 'edit', label: 'Edit', actionKey: 'edit' },
      { icon: 'qr_code', label: 'Barcode', actionKey: 'barcode' },
      { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn' }
    ]}
  ];

  pageSize = 25;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  dataSource = new MatTableDataSource<ItemDisplay>([]);
  loading = false;
  totalItems = 0;

  // Filters
  searchQuery = '';
  selectedCompany = '';
  selectedCategory = '';
  selectedSupplier = '';
  selectedStatus = '';
  showLowStockOnly = false;

  // Dropdown data
  companies: any[] = [];
  categories: any[] = [];
  suppliers: any[] = [];
  statusOptions = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  constructor(
    private itemService: ItemService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadItems();
  }

  loadFilterOptions(): void {
    // Load companies
    this.http.get<any>(`${environment.apiUrl}/companies?isActive=true`).subscribe({
      next: (res: any) => this.companies = res.data || [],
      error: () => this.companies = []
    });

    // Load categories
    this.http.get<any>(`${environment.apiUrl}/categories?isActive=true`).subscribe({
      next: (res: any) => this.categories = res.data || [],
      error: () => this.categories = []
    });

    // Load suppliers
    this.http.get<any>(`${environment.apiUrl}/account-heads?type=supplier&isActive=true`).subscribe({
      next: (res: any) => this.suppliers = res.data || [],
      error: () => this.suppliers = []
    });
  }

  loadItems(): void {
    this.loading = true;

    // Build query parameters
    const params: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    if (this.searchQuery) {
      params.keyword = this.searchQuery;
    }
    if (this.selectedCompany) {
      params.companyId = this.selectedCompany;
    }
    if (this.selectedCategory) {
      params.categoryId = this.selectedCategory;
    }
    if (this.selectedSupplier) {
      params.mainSupplierId = this.selectedSupplier;
    }
    if (this.selectedStatus) {
      params.isActive = this.selectedStatus === 'active';
    }
    if (this.showLowStockOnly) {
      params.lowStock = true;
    }

    this.itemService.getItems(params).subscribe({
      next: (response: any) => {
        if (response.success) {
          const items = response.data || [];
          this.dataSource.data = items.map((item: any) => this.mapItemToDisplay(item));
          this.totalItems = response.pagination?.totalItems || items.length;
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Failed to load items:', error);
        this.toastService.error('Failed to load items');
        this.loading = false;
      }
    });
  }

  mapItemToDisplay(item: any): ItemDisplay {
    return {
      _id: item._id,
      code: item.code,
      name: item.name,
      companyName: item.companyId?.name || item.company?.name || item.manufacturer || '-',
      categoryName: item.categoryId?.name || item.category?.name || item.category || '-',
      genericName: item.formulaId?.name || item.generic?.name || '-',
      supplierName:
        item.supplier?.primarySupplierId?.name
        || item.mainSupplierId?.name
        || item.supplier?.name
        || '-',
      unitPurchaseTP: item.pricing?.unit?.purchaseTP || item.pricing?.purchasePrice || item.pricing?.costPrice || 0,
      unitSaleTP: item.pricing?.unit?.saleTP || item.pricing?.salePrice || 0,
      unitRetailPrice: item.pricing?.unit?.retailPrice || item.pricing?.retailPrice || item.pricing?.mrp || 0,
      currentStock: item.inventory?.currentStock || 0,
      minimumStock: item.inventory?.minimumStock || 0,
      isActive: item.isActive !== false,
      barcode: item.barcode || item.sku,
      image: item.image,
      rawItem: item
    };
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.loadItems();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadItems();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCompany = '';
    this.selectedCategory = '';
    this.selectedSupplier = '';
    this.selectedStatus = '';
    this.showLowStockOnly = false;
    this.onFilterChange();
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadItems();
  }

  onSortChange(event: any): void {
    // Implement sort if needed by API
    this.loadItems();
  }

  getItemSerial(row: any): number {
    const index = this.dataSource.data.indexOf(row);
    return (this.pageIndex * this.pageSize) + index + 1;
  }

  onTableAction(event: TableActionClickEvent): void {
    const item = event.row as ItemDisplay;
    switch(event.action) {
      case 'view': this.viewItem(item); break;
      case 'edit': this.openEditDialog(item); break;
      case 'barcode': this.printBarcode(item); break;
      case 'delete': this.deleteItem(item); break;
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ItemRegistrationFormComponent, {
      width: '95vw',
      maxWidth: '1400px',
      height: '90vh',
      disableClose: true,
      panelClass: 'item-registration-dialog-panel',
      data: { item: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadItems();
      }
    });
  }

  openEditDialog(item: ItemDisplay): void {
    const dialogRef = this.dialog.open(ItemRegistrationFormComponent, {
      width: '95vw',
      maxWidth: '1400px',
      height: '90vh',
      disableClose: true,
      panelClass: 'item-registration-dialog-panel',
      data: { item: item.rawItem || item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadItems();
      }
    });
  }

  onExport(): void {
    console.log('Export functionality triggered');
    // Implement actual export logic here
    // For example, downloading CSV or Excel of the current items
  }

  viewItem(item: ItemDisplay): void {
    // Open view dialog or navigate to detail page
    this.toastService.info('View item details: ' + item.name);
  }

  deleteItem(item: ItemDisplay): void {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      this.itemService.deleteItem(item._id).subscribe({
        next: () => {
          this.toastService.success('Item deleted successfully');
          this.loadItems();
        },
        error: (error: any) => {
          console.error('Failed to delete item:', error);
          this.toastService.error('Failed to delete item');
        }
      });
    }
  }

  printBarcode(item: ItemDisplay): void {
    // Generate barcode and print
    this.toastService.info('Printing barcode for: ' + item.name);
    // TODO: Implement barcode printing
    window.print();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-PK').format(value || 0);
  }

  isLowStock(item: ItemDisplay): boolean {
    return item.currentStock <= item.minimumStock;
  }

  getStockStatus(item: ItemDisplay): string {
    if (item.currentStock === 0) return 'Out of Stock';
    if (item.currentStock <= item.minimumStock) return 'Low Stock';
    return 'In Stock';
  }

  getStockStatusClass(item: ItemDisplay): string {
    if (item.currentStock === 0) return 'out-of-stock';
    if (item.currentStock <= item.minimumStock) return 'low-stock';
    return 'in-stock';
  }
}
