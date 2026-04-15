/**
 * EXAMPLE USAGE COMPONENT
 *
 * This file demonstrates how to use the new redesigned dialog components
 * in your Angular application.
 *
 * Copy and adapt this code to your actual components.
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ItemFormDialogRedesignComponent } from './features/items/components/item-form-dialog/item-form-dialog-redesign.component';
import { SalesmanRegistrationDialogComponent } from './features/master-data/components/salesman-registration/salesman-registration-dialog.component';
import { ToastService } from './shared/services/toast.service';

@Component({
  selector: 'app-example-usage',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  template: `
    <div class="example-container">
      <h1>Dialog Components Example</h1>

      <div class="section">
        <h2>Item Management</h2>
        <div class="button-group">
          <button mat-raised-button color="primary" (click)="createNewItem()">
            <mat-icon>add</mat-icon>
            Create New Item
          </button>
          <button mat-raised-button color="accent" (click)="editSampleItem()">
            <mat-icon>edit</mat-icon>
            Edit Sample Item
          </button>
        </div>
      </div>

      <div class="section">
        <h2>Salesman Management</h2>
        <div class="button-group">
          <button mat-raised-button color="primary" (click)="registerNewSalesman()">
            <mat-icon>person_add</mat-icon>
            Register New Salesman
          </button>
          <button mat-raised-button color="accent" (click)="editSampleSalesman()">
            <mat-icon>edit</mat-icon>
            Edit Sample Salesman
          </button>
        </div>
      </div>

      <!-- Sample Data Table -->
      <div class="section" *ngIf="items.length > 0">
        <h2>Sample Items</h2>
        <table mat-table [dataSource]="items" class="mat-elevation-z2">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let item">{{ item.name }}</td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Category</th>
            <td mat-cell *matCellDef="let item">{{ item.category }}</td>
          </ng-container>

          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef>Price</th>
            <td mat-cell *matCellDef="let item">{{ item.pricing?.salePrice || 0 | currency:'PKR' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let item">
              <button mat-icon-button (click)="editItem(item)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteItem(item)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .example-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: #333;
      margin-bottom: 32px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section h2 {
      color: #555;
      margin-bottom: 16px;
      font-size: 20px;
    }

    .button-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    table {
      width: 100%;
    }

    th {
      background: #7367f0;
      color: white;
      font-weight: 600;
    }
  `]
})
export class ExampleUsageComponent {
  items: any[] = [];
  salesmen: any[] = [];
  displayedColumns = ['name', 'category', 'price', 'actions'];

  constructor(
    private dialog: MatDialog,
    private toastService: ToastService
  ) {
    // Sample data
    this.items = [
      {
        _id: '1',
        name: 'Paracetamol 500mg',
        category: 'Tablet',
        pricing: { salePrice: 150 },
        unit: 'Box'
      },
      {
        _id: '2',
        name: 'Amoxicillin 250mg',
        category: 'Capsule',
        pricing: { salePrice: 280 },
        unit: 'Strip'
      }
    ];
  }

  // ===============================
  // ITEM DIALOG METHODS
  // ===============================

  /**
   * Open dialog to create a new item
   */
  createNewItem(): void {
    const dialogRef = this.dialog.open(ItemFormDialogRedesignComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: false,
      data: {} // Empty object for create mode
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('New item created:', result);
        this.toastService.success('Item created successfully!');

        // Add to local array (in real app, refresh from API)
        this.items.push(result);
      }
    });
  }

  /**
   * Open dialog to edit an existing item
   */
  editItem(item: any): void {
    const dialogRef = this.dialog.open(ItemFormDialogRedesignComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: false,
      data: { item } // Pass the item object for edit mode
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Item updated:', result);
        this.toastService.success('Item updated successfully!');

        // Update in local array (in real app, refresh from API)
        const index = this.items.findIndex(i => i._id === item._id);
        if (index !== -1) {
          this.items[index] = result;
        }
      }
    });
  }

  /**
   * Edit a sample item (for testing)
   */
  editSampleItem(): void {
    if (this.items.length > 0) {
      this.editItem(this.items[0]);
    } else {
      this.toastService.warning('No items available to edit');
    }
  }

  /**
   * Delete an item
   */
  deleteItem(item: any): void {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      const index = this.items.findIndex(i => i._id === item._id);
      if (index !== -1) {
        this.items.splice(index, 1);
        this.toastService.success('Item deleted successfully!');
      }
    }
  }

  // ===============================
  // SALESMAN DIALOG METHODS
  // ===============================

  /**
   * Open dialog to register a new salesman
   */
  registerNewSalesman(): void {
    const dialogRef = this.dialog.open(SalesmanRegistrationDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      disableClose: false,
      data: {} // Empty object for register mode
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('New salesman registered:', result);
        this.toastService.success('Salesman registered successfully!');

        // Add to local array (in real app, refresh from API)
        this.salesmen.push(result);
      }
    });
  }

  /**
   * Open dialog to edit an existing salesman
   */
  editSalesman(salesman: any): void {
    const dialogRef = this.dialog.open(SalesmanRegistrationDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      disableClose: false,
      data: { salesman } // Pass the salesman object for edit mode
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Salesman updated:', result);
        this.toastService.success('Salesman updated successfully!');

        // Update in local array (in real app, refresh from API)
        const index = this.salesmen.findIndex(s => s._id === salesman._id);
        if (index !== -1) {
          this.salesmen[index] = result;
        }
      }
    });
  }

  /**
   * Edit a sample salesman (for testing)
   */
  editSampleSalesman(): void {
    // Create a sample salesman for testing
    const sampleSalesman = {
      _id: '1',
      fullName: 'Ahmed Khan',
      fatherName: 'Khan Sahib',
      cnic: '12345-1234567-1',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      mobile: '0300-1234567',
      permanentAddress: '123 Main Street, Karachi',
      city: 'Karachi',
      designation: 'Sales Executive',
      department: 'Sales',
      joiningDate: new Date('2020-01-01'),
      isActive: true
    };

    this.editSalesman(sampleSalesman);
  }

  // ===============================
  // ADVANCED USAGE EXAMPLES
  // ===============================

  /**
   * Open dialog with pre-filled data
   */
  openDialogWithDefaultData(): void {
    const defaultItem = {
      category: 'Tablet',
      unit: 'Box',
      packSize: 1,
      costPrice: 100,
      salePrice: 150,
      gstRate: 17,
      isActive: true
    };

    const dialogRef = this.dialog.open(ItemFormDialogRedesignComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { item: defaultItem }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Item with default data created:', result);
      }
    });
  }

  /**
   * Open dialog and perform action based on result
   */
  async openDialogAndProcess(): Promise<void> {
    const dialogRef = this.dialog.open(ItemFormDialogRedesignComponent, {
      width: '800px',
      maxWidth: '95vw'
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      // Process the result
      console.log('Processing item:', result);

      // Perform async operations
      try {
        // await this.itemService.createItem(result);
        this.toastService.success('Item processed successfully!');
      } catch (error) {
        this.toastService.error('Error processing item');
        console.error(error);
      }
    }
  }

  /**
   * Open multiple dialogs in sequence
   */
  openDialogSequence(): void {
    // First dialog
    const firstDialog = this.dialog.open(ItemFormDialogRedesignComponent, {
      width: '800px',
      maxWidth: '95vw'
    });

    firstDialog.afterClosed().subscribe(firstResult => {
      if (firstResult) {
        console.log('First item created:', firstResult);

        // Open second dialog after first one closes
        const secondDialog = this.dialog.open(ItemFormDialogRedesignComponent, {
          width: '800px',
          maxWidth: '95vw'
        });

        secondDialog.afterClosed().subscribe(secondResult => {
          if (secondResult) {
            console.log('Second item created:', secondResult);
            this.toastService.success('Both items created!');
          }
        });
      }
    });
  }
}

// ===============================
// USAGE IN OTHER COMPONENTS
// ===============================

/**
 * Simple usage example in any component:
 *
 * 1. Inject MatDialog in constructor
 * 2. Call dialog.open() with the component
 * 3. Subscribe to afterClosed() to get the result
 */

// Example 1: Minimal usage
/*
export class MyComponent {
  constructor(private dialog: MatDialog) {}

  openDialog() {
    this.dialog.open(ItemFormDialogRedesignComponent, {
      width: '800px'
    });
  }
}
*/

// Example 2: With data and result handling
/*
export class MyComponent {
  constructor(private dialog: MatDialog) {}

  openDialog(item?: any) {
    const dialogRef = this.dialog.open(ItemFormDialogRedesignComponent, {
      width: '800px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Dialog result:', result);
      }
    });
  }
}
*/

// Example 3: Async/await pattern
/*
export class MyComponent {
  constructor(private dialog: MatDialog) {}

  async openDialog() {
    const dialogRef = this.dialog.open(ItemFormDialogRedesignComponent, {
      width: '800px'
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result) {
      // Do something with result
    }
  }
}
*/
