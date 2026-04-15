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
import { ItemService } from '../../services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ItemRegistrationFormComponent } from '../item-form-dialog/item-registration-form.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

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
    MatCheckboxModule
  ],
  templateUrl: './item-list-enhanced.component.html',
  styleUrl: './item-list-enhanced.component.scss'
})
export class ItemListEnhancedComponent implements OnInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  displayedColumns: string[] = [
    'serial',
    'company',
    'name',
    'availableQty',
    'lastPPrice',
    'avgPRate',
    'totalCost',
    'saleRate',
    'category',
    'actions'
  ];

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
      next: (res) => this.companies = res.data || [],
      error: () => this.companies = []
    });

    // Load categories
    this.http.get<any>(`${environment.apiUrl}/categories?isActive=true`).subscribe({
      next: (res) => this.categories = res.data || [],
      error: () => this.categories = []
    });

    // Load suppliers
    this.http.get<any>(`${environment.apiUrl}/account-heads?type=supplier&isActive=true`).subscribe({
      next: (res) => this.suppliers = res.data || [],
      error: () => this.suppliers = []
    });
  }

  loadItems(): void {
    this.loading = true;

    // Build query parameters
    const params: any = {
      page: this.paginator?.pageIndex ? this.paginator.pageIndex + 1 : 1,
      limit: this.paginator?.pageSize || 25
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
      error: (error) => {
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
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadItems();
  }

  onFilterChange(): void {
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
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

  onPageChange(): void {
    this.loadItems();
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
        error: (error) => {
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
