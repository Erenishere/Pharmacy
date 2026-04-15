import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { Item } from '../../services/item-master.service';
import { InventoryService } from '../../../inventory/services/inventory.service';

@Component({
  selector: 'app-item-master-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatDividerModule
  ],
  templateUrl: './item-master-detail.component.html',
  styleUrl: './item-master-detail.component.scss'
})
export class ItemMasterDetailComponent implements OnInit {
  item: Item;
  warehouseStock: any[] = [];
  loadingStock = false;
  displayedColumns: string[] = ['warehouse', 'quantity', 'available', 'reserved'];

  constructor(
    private dialogRef: MatDialogRef<ItemMasterDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private inventoryService: InventoryService
  ) {
    this.item = data.item;
  }

  ngOnInit() {
    this.loadWarehouseStock();
  }

  loadWarehouseStock() {
    this.loadingStock = true;
    this.inventoryService.getWarehouseStock(this.item._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.warehouseStock = response.data;
        }
        this.loadingStock = false;
      },
      error: (err) => {
        console.error('Error loading warehouse stock', err);
        this.loadingStock = false;
      }
    });
  }

  close() {
    this.dialogRef.close();
  }
}
