import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { PosService, Item } from '../../../../core/services/pos.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ItemFormDialogComponent } from '../item-form-dialog/item-form-dialog.component';
import { ItemDetailDialogComponent } from '../item-detail-dialog/item-detail-dialog.component';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    FormsModule,
    MatProgressSpinnerModule,
    DataTableComponent
  ],
  template: `
    <div class="list-page-container items-page">
      <div class="list-page-header">
        <div class="header-content">
          <h1><mat-icon>inventory_2</mat-icon> Items Management</h1>
          <p class="subtitle">Complete pharmaceutical inventory control and price management system</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="addItem()">
            <mat-icon>add</mat-icon> Register New Item
          </button>
          <button mat-stroked-button class="ms-2" (click)="refreshItems()">
            <mat-icon>refresh</mat-icon> Sync Data
          </button>
        </div>
      </div>

      <div class="list-page-card">
        <div class="list-filters-section">
          <div class="filter-group-primary">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search Inventory</mat-label>
              <input matInput [(ngModel)]="searchKeyword" (input)="onSearch()" placeholder="Search by name, SKU, or formula...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>

          <div class="filter-group-secondary">
            <mat-form-field appearance="outline" class="category-filter">
              <mat-label>Category</mat-label>
              <mat-select [(ngModel)]="selectedCategory" (selectionChange)="onCategoryChange()">
                <mat-option value="">All Categories</mat-option>
                <mat-option *ngFor="let category of categories" [value]="category">{{ category }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="status-filter">
              <mat-label>Stock Status</mat-label>
              <mat-select [(ngModel)]="selectedStockStatus" (selectionChange)="onStockStatusChange()">
                <mat-option value="">All Statuses</mat-option>
                <mat-option value="low">Low Stock</mat-option>
                <mat-option value="out">Out of Stock</mat-option>
                <mat-option value="normal">Active</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <div class="table-wrapper">
          <div class="list-loading-overlay" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <app-data-table 
            [data]="items"
            [columns]="tableColumns"
            [totalItems]="totalItems"
            [pageSize]="pageSize"
            [pageIndex]="currentPage"
            class="data-table"
            (pageChange)="onPageChange($event)"
            (actionClick)="onTableAction($event)">
          </app-data-table>

          <div class="list-empty-state" *ngIf="!loading && items.length === 0">
            <mat-icon>inventory_2</mat-icon>
            <p>No products found in the catalog</p>
            <button mat-button color="primary" (click)="addItem()">Register New Item</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ItemListComponent implements OnInit, OnDestroy {
  items: Item[] = [];
  categories: string[] = ['Medicine', 'Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Surgical', 'Herbal'];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0; // Angular Paginator is 0-indexed
  loading = false;

  // Filters
  searchKeyword = '';
  selectedCategory = '';
  selectedStockStatus = '';
  
  tableColumns: TableColumn[] = [
    { key: 'serial', label: 'S#' },
    { key: 'company', label: 'Manufacturer' },
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'availableQty', label: 'Inventory', type: 'status' },
    { key: 'lastPPrice', label: 'Purchase Rate', type: 'currency' },
    { key: 'avgPRate', label: 'Avg Rate', type: 'currency' },
    { key: 'totalCost', label: 'Stock Value', type: 'currency' },
    { key: 'saleRate', label: 'Retail Price', type: 'currency' },
    { key: 'category', label: 'Category' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'visibility', label: 'View Detail', actionKey: 'view', color: 'primary' },
      { icon: 'edit', label: 'Edit', actionKey: 'edit', color: 'accent' },
      { icon: 'inventory', label: 'Adjust Stock', actionKey: 'stock', color: 'primary' }
    ]}
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private posService: PosService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.loadItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackById(index: number, item: Item): string {
    return item._id;
  }

  loadItems() {
    this.loading = true;

    // API page is 1-indexed
    const apiPage = this.currentPage + 1;

    this.posService.getItems(apiPage, this.pageSize, {
      keyword: this.searchKeyword,
      category: this.selectedCategory,
      stockStatus: this.selectedStockStatus
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.items = response.data.map((i: any, index: number) => {
          // Flatten nested mappings so the generic table can render it easily
          return {
            ...i,
            serial: (this.currentPage * this.pageSize) + index + 1,
            company: i.companyId?.name || i.manufacturer || '---',
            category: i.categoryId?.name || i.category || 'Unclassified',
            availableQty: (i.inventory?.currentStock || i.availableStock || 0) + ' ' + (i.unit || 'Units'),
            lastPPrice: i.pricing?.purchasePrice || i.pricing?.costPrice || 0,
            avgPRate: i.pricing?.costPrice || 0,
            totalCost: (i.inventory?.currentStock || 0) * (i.pricing?.costPrice || 0),
            saleRate: i.pricing?.salePrice || i.salePrice || 0,
            pricing: i.pricing || { costPrice: 0, salePrice: i.salePrice || 0 },
            inventory: i.inventory || { currentStock: i.stock || 0, minimumStock: 0, maximumStock: 0, batches: [] }
          };
        });

        if (response.pagination) {
          this.totalItems = response.pagination.totalItems;
        } else {
          this.totalItems = response.data.length;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading items', err);
        this.toastService.error('Failed to load items');
        this.loading = false;
        this.items = [];
      }
    });
  }

  onSearch() {
    this.currentPage = 0;
    this.loadItems();
  }

  onCategoryChange() {
    this.currentPage = 0;
    this.loadItems();
  }

  onStockStatusChange() {
    this.currentPage = 0;
    this.loadItems();
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadItems();
  }

  addItem() {
    const dialogRef = this.dialog.open(ItemFormDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      maxHeight: '800px',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.toastService.success('Item added successfully');
        this.loadItems();
      }
    });
  }

  viewItem(item: Item) {
    this.dialog.open(ItemDetailDialogComponent, {
      width: '80vw',
      maxWidth: '1000px',
      height: '80vh',
      maxHeight: '700px',
      data: { item }
    });
  }

  editItem(item: Item) {
    const dialogRef = this.dialog.open(ItemFormDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      maxHeight: '800px',
      disableClose: true,
      data: { item }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.toastService.success('Item updated successfully');
        this.loadItems();
      }
    });
  }

  updateStock(item: Item) {
    // For now, we'll use the same edit dialog but could create a dedicated stock update dialog later
    this.editItem(item);
  }

  refreshItems() {
    this.loadItems();
  }

  getStockStatusClass(item: Item): string {
    const current = item.inventory?.currentStock || 0;
    const min = item.inventory?.minimumStock || 0;
    const max = item.inventory?.maximumStock || 0;

    if (current === 0) return 'stock-out';
    if (current <= min) return 'stock-low';
    if (max > 0 && current >= max) return 'stock-over';
    return 'stock-normal';
  }

  onTableAction(event: { action: string, row: any }): void {
    const item = event.row as Item;
    switch(event.action) {
      case 'view': this.viewItem(item); break;
      case 'edit': this.editItem(item); break;
      case 'stock': this.updateStock(item); break;
    }
  }
}