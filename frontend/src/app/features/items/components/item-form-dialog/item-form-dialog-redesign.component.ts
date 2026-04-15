import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ItemService } from '../../services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';

interface Item {
    _id: string;
    code: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
    pricing: {
        costPrice: number;
        salePrice: number;
        currency: string;
    };
    tax?: {
        gstRate: number;
        whtRate: number;
        taxCategory: string;
    };
    inventory: {
        currentStock: number;
        minimumStock: number;
        maximumStock: number;
    };
    barcode?: string;
    sku?: string;
    packSize?: number;
    supplier?: {
        primarySupplierId?: string;
        supplierItemCode?: string;
        leadTimeFromSupplier?: number;
    };
    regulatory?: {
        taxRegistrationNumber?: string;
        complianceStatus?: string;
    };
    metadata?: {
        manufacturer?: string;
        brand?: string;
        strength?: string;
        storageConditions?: string;
        handlingInstructions?: string;
    };
    isActive: boolean;
}

@Component({
    selector: 'app-item-form-dialog-redesign',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatProgressSpinnerModule
    ],
    template: `
        <div class="modern-dialog">
            <!-- Header -->
            <div class="dialog-header">
                <div class="header-content">
                    <div class="header-left">
                        <div class="header-icon">📦</div>
                        <div>
                            <h1 class="dialog-title">{{ isEditMode ? 'Edit Item' : 'Create New Item' }}</h1>
                            <p class="dialog-subtitle">{{ isEditMode ? 'Update product information' : 'Add a new product to your inventory' }}</p>
                        </div>
                    </div>
                    <button mat-icon-button class="close-btn" (click)="onCancel()">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="dialog-body" [formGroup]="itemForm">
                <!-- Basic Information -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">ℹ️</div>
                        <h2 class="section-title">Basic Information</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label">Item Name <span class="required">*</span></label>
                            <input type="text" class="field-input" formControlName="name" placeholder="Enter item name">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Category <span class="required">*</span></label>
                            <select class="field-input" formControlName="category">
                                <option value="">Select category</option>
                                <option *ngFor="let cat of categories" [value]="cat.value">{{ cat.label }}</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="field-label">Brand</label>
                            <input type="text" class="field-input" formControlName="brand" placeholder="Enter brand name">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Manufacturer</label>
                            <input type="text" class="field-input" formControlName="manufacturer" placeholder="Enter manufacturer">
                        </div>
                    </div>
                </div>

                <!-- Specifications -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">📋</div>
                        <h2 class="section-title">Specifications</h2>
                    </div>
                    <div class="form-grid specs-grid">
                        <div class="form-field">
                            <label class="field-label">Barcode</label>
                            <input type="text" class="field-input" formControlName="barcode" placeholder="Scan or enter">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Pack Size</label>
                            <input type="number" class="field-input" formControlName="packSize" placeholder="1">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Unit of Measure <span class="required">*</span></label>
                            <select class="field-input" formControlName="unit">
                                <option value="">Select unit</option>
                                <option *ngFor="let u of units" [value]="u.value">{{ u.label }}</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="field-label">Strength/Dosage</label>
                            <input type="text" class="field-input" formControlName="strength" placeholder="e.g., 500mg">
                        </div>
                    </div>
                </div>

                <!-- Storage & Handling -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">🏪</div>
                        <h2 class="section-title">Storage & Handling</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field full-width">
                            <label class="field-label">Storage Conditions</label>
                            <textarea class="field-textarea" formControlName="storageConditions"
                                placeholder="e.g., Store at room temperature, away from moisture and heat"></textarea>
                            <span class="field-hint">Describe optimal storage requirements</span>
                        </div>
                        <div class="form-field full-width">
                            <label class="field-label">Handling Instructions</label>
                            <textarea class="field-textarea" formControlName="handlingInstructions"
                                placeholder="e.g., Handle with care, avoid exposure to direct sunlight"></textarea>
                            <span class="field-hint">Special handling requirements if any</span>
                        </div>
                    </div>
                </div>

                <!-- Pricing -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">💰</div>
                        <h2 class="section-title">Pricing & Tax</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label">Cost Price <span class="required">*</span></label>
                            <input type="number" class="field-input" formControlName="costPrice" placeholder="0.00" step="0.01">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Sale Price <span class="required">*</span></label>
                            <input type="number" class="field-input" formControlName="salePrice" placeholder="0.00" step="0.01">
                        </div>
                        <div class="form-field">
                            <label class="field-label">GST Rate (%)</label>
                            <input type="number" class="field-input" formControlName="gstRate" placeholder="0" step="0.01">
                        </div>
                        <div class="form-field">
                            <label class="field-label">WHT Rate (%)</label>
                            <input type="number" class="field-input" formControlName="whtRate" placeholder="0" step="0.01">
                        </div>
                    </div>
                </div>

                <!-- Inventory -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">📊</div>
                        <h2 class="section-title">Inventory Levels</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label">Current Stock</label>
                            <input type="number" class="field-input" formControlName="currentStock" placeholder="0">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Minimum Stock</label>
                            <input type="number" class="field-input" formControlName="minimumStock" placeholder="0">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Maximum Stock</label>
                            <input type="number" class="field-input" formControlName="maximumStock" placeholder="1000">
                        </div>
                    </div>
                </div>

                <!-- Additional Options -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">⚙️</div>
                        <h2 class="section-title">Additional Options</h2>
                    </div>
                    <div class="checkbox-container">
                        <mat-checkbox formControlName="isActive" color="primary">Active Status</mat-checkbox>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="dialog-footer">
                <div class="footer-info">
                    <span class="required">*</span> Required fields
                </div>
                <div class="footer-actions">
                    <button mat-stroked-button class="btn-cancel" (click)="onCancel()" [disabled]="saving">
                        Cancel
                    </button>
                    <button mat-raised-button class="btn-submit" (click)="onSubmit()" [disabled]="saving || itemForm.invalid">
                        <mat-icon *ngIf="!saving">check</mat-icon>
                        <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
                        <span>{{ isEditMode ? 'Update' : 'Create' }} Item</span>
                    </button>
                </div>
            </div>
        </div>
    `,
    styleUrl: './item-form-dialog-redesign.component.scss'
})
export class ItemFormDialogRedesignComponent implements OnInit {
    itemForm: FormGroup;
    isEditMode = false;
    saving = false;

    categories = [
        { value: 'Tablet', label: 'Tablet' },
        { value: 'Capsule', label: 'Capsule' },
        { value: 'Syrup', label: 'Syrup' },
        { value: 'Injection', label: 'Injection' },
        { value: 'Ointment', label: 'Ointment' },
        { value: 'Other', label: 'Other' }
    ];

    units = [
        { value: 'Box', label: 'Box' },
        { value: 'Strip', label: 'Strip' },
        { value: 'Piece', label: 'Piece' },
        { value: 'Bottle', label: 'Bottle' },
        { value: 'Vial', label: 'Vial' },
        { value: 'Tube', label: 'Tube' }
    ];

    constructor(
        private fb: FormBuilder,
        private itemService: ItemService,
        private toastService: ToastService,
        private dialogRef: MatDialogRef<ItemFormDialogRedesignComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { item?: Item }
    ) {
        this.isEditMode = !!data?.item;
        this.itemForm = this.createForm();
    }

    ngOnInit(): void {
        if (this.isEditMode && this.data.item) {
            this.populateForm(this.data.item);
        }
    }

    createForm(): FormGroup {
        return this.fb.group({
            // Basic
            name: ['', [Validators.required, Validators.maxLength(200)]],
            category: ['', Validators.required],
            brand: [''],
            manufacturer: [''],

            // Specifications
            barcode: [''],
            packSize: [1, [Validators.min(1)]],
            unit: ['', Validators.required],
            strength: [''],

            // Storage
            storageConditions: [''],
            handlingInstructions: [''],

            // Pricing
            costPrice: [0, [Validators.required, Validators.min(0)]],
            salePrice: [0, [Validators.required, Validators.min(0)]],
            gstRate: [0, [Validators.min(0), Validators.max(100)]],
            whtRate: [0, [Validators.min(0), Validators.max(100)]],

            // Inventory
            currentStock: [0, [Validators.min(0)]],
            minimumStock: [0, [Validators.min(0)]],
            maximumStock: [1000, [Validators.min(0)]],

            isActive: [true]
        });
    }

    populateForm(item: Item): void {
        this.itemForm.patchValue({
            name: item.name,
            category: item.category,
            brand: item.metadata?.brand || '',
            manufacturer: item.metadata?.manufacturer || '',
            barcode: item.barcode || '',
            packSize: item.packSize || 1,
            unit: item.unit,
            strength: item.metadata?.strength || '',
            storageConditions: item.metadata?.storageConditions || '',
            handlingInstructions: item.metadata?.handlingInstructions || '',
            costPrice: item.pricing.costPrice,
            salePrice: item.pricing.salePrice,
            gstRate: item.tax?.gstRate || 0,
            whtRate: item.tax?.whtRate || 0,
            currentStock: item.inventory.currentStock,
            minimumStock: item.inventory.minimumStock,
            maximumStock: item.inventory.maximumStock,
            isActive: item.isActive
        });
    }

    onSubmit(): void {
        if (this.itemForm.invalid) {
            this.toastService.warning('Please fill in all required fields correctly');
            return;
        }

        this.saving = true;
        const formValue = this.itemForm.value;

        const itemData = {
            name: formValue.name,
            code: formValue.code,
            category: formValue.category,
            unit: formValue.unit,
            pricing: {
                costPrice: formValue.costPrice,
                salePrice: formValue.salePrice,
                currency: 'PKR'
            },
            tax: {
                gstRate: formValue.gstRate,
                whtRate: formValue.whtRate,
                taxCategory: 'standard'
            },
            inventory: {
                currentStock: formValue.currentStock,
                minimumStock: formValue.minimumStock,
                maximumStock: formValue.maximumStock
            },
            barcode: formValue.barcode,
            packSize: formValue.packSize,
            metadata: {
                manufacturer: formValue.manufacturer,
                brand: formValue.brand,
                strength: formValue.strength,
                storageConditions: formValue.storageConditions,
                handlingInstructions: formValue.handlingInstructions
            },
            isActive: formValue.isActive
        };

        const request = this.isEditMode && this.data.item
            ? this.itemService.updateItem(this.data.item._id, itemData)
            : this.itemService.createItem(itemData);

        request.subscribe({
            next: (response: any) => {
                this.toastService.success(
                    this.isEditMode ? 'Item updated successfully' : 'Item created successfully'
                );
                this.dialogRef.close(response.data);
            },
            error: (error: any) => {
                console.error('Error saving item:', error);
                this.toastService.error('Failed to save item: ' + (error.error?.message || 'Unknown error'));
                this.saving = false;
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
