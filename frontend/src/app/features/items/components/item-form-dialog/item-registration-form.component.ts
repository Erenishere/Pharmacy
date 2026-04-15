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
import { MatTooltipModule } from '@angular/material/tooltip';
import { ItemService } from '../../services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-item-registration-form',
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
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './item-registration-form.component.html',
  styleUrl: './item-registration-form.component.scss'
})
export class ItemRegistrationFormComponent implements OnInit {
  itemForm!: FormGroup;
  isEditMode = false;
  saving = false;
  imagePreview: string | null = null;

  // Dropdown data
  companies: any[] = [];
  sellingGroups = [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' }
  ];
  formulas: any[] = [];
  formulaSizes: any[] = [];
  categories: any[] = [];
  subCategories: any[] = [];
  businessTypes: any[] = [];
  suppliers: any[] = [];
  units = [
    { value: 'piece', label: 'Piece' },
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
    { value: 'dozen', label: 'Dozen' },
    { value: 'bottle', label: 'Bottle' },
    { value: 'strip', label: 'Strip' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'capsule', label: 'Capsule' }
  ];
  gstRateOptions = [0, 4, 18];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ItemRegistrationFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item?: any },
    private itemService: ItemService,
    private toastService: ToastService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data?.item;
    this.initializeForm();
    this.setupDependentDropdowns();
    this.loadDropdownData();

    if (this.isEditMode && this.data.item) {
      this.populateForm(this.data.item);
    }
  }

  initializeForm(): void {
    this.itemForm = this.fb.group({
      // A. Company & Classification
      companyId: ['', Validators.required],
      sellingGroup: [''],
      formulaId: [''],
      formulaSizeId: [''],
      categoryId: ['', Validators.required],
      subCategoryId: [''],
      businessTypeId: ['', Validators.required],
      mainSupplierId: [''],

      // B. Basic Information
      code: ['', Validators.required],
      name: ['', Validators.required],
      unit: ['piece', Validators.required],
      image: [''],
      isActive: [true],

      // C. Packaging & Measurement
      cartonLength: [0],
      cartonWidth: [0],
      cartonHeight: [0],
      unitsInCarton: [1, [Validators.required, Validators.min(1)]],
      unitsInBox: [1, [Validators.required, Validators.min(1)]],
      boxesInCarton: [1, [Validators.required, Validators.min(1)]],
      unitWeight: [0],
      boxWeight: [0],
      cartonWeight: [0],

      // D. Pricing - Unit Level
      unitPurchaseTP: [0, [Validators.required, Validators.min(0)]],
      unitSaleTP: [0, [Validators.required, Validators.min(0)]],
      unitRetailPrice: [0, [Validators.required, Validators.min(0)]],

      // D. Pricing - Box/Dozen Level
      boxPurchaseTP: [0, Validators.min(0)],
      boxSaleTP: [0, Validators.min(0)],
      boxRetailPrice: [0, Validators.min(0)],

      // D. Pricing - Carton Level
      cartonPurchaseTP: [0, Validators.min(0)],
      cartonSaleTP: [0, Validators.min(0)],

      // E. Tax Configuration
      gstFiler: [0, [Validators.min(0), Validators.max(100)]],
      gstNonFiler: [0, [Validators.min(0), Validators.max(100)]],

      // F. Stock Alerts
      minimumStock: [10, [Validators.required, Validators.min(0)]],
      maximumStock: [1000, [Validators.required, Validators.min(0)]],
      noSalesAlertDays: [30, Validators.min(0)],

      // G. Barcode
      barcode: [''],
      autoGenerateBarcode: [false],

      // H. Additional Charges
      goodsChargesPerUnit: [0, Validators.min(0)]
    });
  }

  setupDependentDropdowns(): void {
    this.itemForm.get('categoryId')?.valueChanges.subscribe((categoryId: string) => {
      this.loadSubCategoriesByCategory(categoryId);
    });

    this.itemForm.get('formulaId')?.valueChanges.subscribe((formulaId: string) => {
      this.loadFormulaSizesByFormula(formulaId);
    });
  }

  loadDropdownData(): void {
    // Load Companies
    this.http.get<any>(`${environment.apiUrl}/companies?isActive=true&limit=500`).subscribe({
      next: (res) => this.companies = res.data || [],
      error: () => this.companies = []
    });

    // Load Categories
    this.http.get<any>(`${environment.apiUrl}/categories?isActive=true&limit=500`).subscribe({
      next: (res) => this.categories = res.data || [],
      error: () => this.categories = []
    });

    // Load Formulas
    this.http.get<any>(`${environment.apiUrl}/formulas?isActive=true&limit=500`).subscribe({
      next: (res) => this.formulas = res.data || [],
      error: () => this.formulas = []
    });

    // Load Business Types
    this.http.get<any>(`${environment.apiUrl}/business-types?isActive=true&limit=500`).subscribe({
      next: (res) => this.businessTypes = res.data || [],
      error: () => this.businessTypes = []
    });

    // Load Suppliers from Account Heads
    this.http.get<any>(`${environment.apiUrl}/account-heads?type=supplier&isActive=true&limit=500`).subscribe({
      next: (res) => this.suppliers = res.data || [],
      error: () => this.suppliers = []
    });
  }

  loadSubCategoriesByCategory(categoryId: string): void {
    if (!categoryId) {
      this.subCategories = [];
      return;
    }
    this.http.get<any>(`${environment.apiUrl}/subcategories?categoryId=${categoryId}&isActive=true&limit=500`).subscribe({
      next: (res) => this.subCategories = res.data || [],
      error: () => this.subCategories = []
    });
  }

  loadFormulaSizesByFormula(formulaId: string): void {
    if (!formulaId) {
      this.formulaSizes = [];
      return;
    }
    this.http.get<any>(`${environment.apiUrl}/formula-sizes?formulaId=${formulaId}&isActive=true&limit=500`).subscribe({
      next: (res) => this.formulaSizes = res.data || [],
      error: () => this.formulaSizes = []
    });
  }

  populateForm(item: any): void {
    const categoryId = this.resolveId(item.categoryId) || (this.looksLikeObjectId(item.category) ? item.category : '');
    const formulaId = this.resolveId(item.formulaId) || this.resolveId(item.genericId);

    this.itemForm.patchValue({
      companyId: this.resolveId(item.companyId),
      sellingGroup: item.sellingGroup,
      formulaId,
      formulaSizeId: this.resolveId(item.formulaSizeId) || this.resolveId(item.genericSize),
      categoryId,
      subCategoryId: this.resolveId(item.subCategoryId) || this.resolveId(item.subCategory),
      businessTypeId: this.resolveId(item.businessTypeId) || this.resolveId(item.businessType),
      mainSupplierId: this.resolveId(item.supplier?.primarySupplierId) || this.resolveId(item.mainSupplierId),
      code: item.code,
      name: item.name,
      unit: item.unit || 'piece',
      image: item.productImage || item.image,
      isActive: item.isActive !== false,
      // Packaging
      cartonLength: item.carton?.size?.length || item.packaging?.cartonLength || item.packaging?.cartonDimensions?.length || 0,
      cartonWidth: item.carton?.size?.width || item.packaging?.cartonWidth || item.packaging?.cartonDimensions?.width || 0,
      cartonHeight: item.carton?.size?.height || item.packaging?.cartonHeight || item.packaging?.cartonDimensions?.height || 0,
      unitsInCarton: item.carton?.unitsInCarton || item.packaging?.unitsInCarton || 1,
      unitsInBox: item.box?.unitsInBox || item.packaging?.unitsInBox || 1,
      boxesInCarton: item.carton?.boxInCarton || item.packaging?.boxesInCarton || 1,
      unitWeight: item.unitWeight || item.packaging?.unitWeight || item.packaging?.weight?.unit || 0,
      boxWeight: item.box?.weight || item.packaging?.boxWeight || item.packaging?.weight?.box || 0,
      cartonWeight: item.carton?.weight || item.packaging?.cartonWeight || item.packaging?.weight?.carton || 0,
      // Pricing
      unitPurchaseTP: item.pricing?.purchasePrice || item.pricing?.costPrice || item.pricing?.unit?.purchaseTP || 0,
      unitSaleTP: item.pricing?.salePrice || item.pricing?.unit?.saleTP || 0,
      unitRetailPrice: item.pricing?.retailPrice || item.pricing?.mrp || item.pricing?.unit?.retailPrice || 0,
      boxPurchaseTP: item.pricing?.boxPurchasePrice || item.pricing?.box?.purchaseTP || 0,
      boxSaleTP: item.pricing?.boxSalePrice || item.pricing?.box?.saleTP || 0,
      boxRetailPrice: item.pricing?.boxRetailPrice || item.pricing?.box?.retailPrice || 0,
      cartonPurchaseTP: item.pricing?.cartonPurchasePrice || item.pricing?.carton?.purchaseTP || 0,
      cartonSaleTP: item.pricing?.cartonSalePrice || item.pricing?.carton?.saleTP || 0,
      // Tax
      gstFiler: item.tax?.gstRate ?? item.tax?.gstFiler ?? 0,
      gstNonFiler: item.tax?.gstRateNonFilter ?? item.tax?.gstNonFiler ?? 0,
      // Stock Alerts
      minimumStock: item.inventory?.minimumStock || 10,
      maximumStock: item.inventory?.maximumStock || 1000,
      noSalesAlertDays: item.inventory?.alertNoSalesDays || item.alerts?.noSalesAlertDays || 30,
      // Barcode
      barcode: item.barcode || '',
      // Additional
      goodsChargesPerUnit: item.pricing?.goodsChargesOnUnit || item.additionalCharges?.goodsChargesPerUnit || 0
    });

    if (categoryId) {
      this.loadSubCategoriesByCategory(categoryId);
    }
    if (formulaId) {
      this.loadFormulaSizesByFormula(formulaId);
    }

    if (item.productImage || item.image) {
      this.imagePreview = item.productImage || item.image;
    }
  }

  onImageSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this.itemForm.patchValue({ image: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  generateBarcode(): void {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const barcode = `${timestamp.slice(-8)}${random}`;
    this.itemForm.patchValue({ barcode });
  }

  calculateNetPrices(): {
    netPurchase: number;
    netSale: number;
    retailWithGST: number;
  } {
    const unitPurchase = this.itemForm.get('unitPurchaseTP')?.value || 0;
    const unitSale = this.itemForm.get('unitSaleTP')?.value || 0;
    const unitRetail = this.itemForm.get('unitRetailPrice')?.value || 0;
    const gstFiler = this.itemForm.get('gstFiler')?.value || 0;

    return {
      netPurchase: unitPurchase + (unitPurchase * gstFiler / 100),
      netSale: unitSale + (unitSale * gstFiler / 100),
      retailWithGST: unitRetail + (unitRetail * gstFiler / 100)
    };
  }

  onSubmit(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      this.toastService.error('Please fill all required fields');
      return;
    }

    this.saving = true;
    const formValue = this.itemForm.value;
    const gstFiler = this.normalizeGstRate(formValue.gstFiler);
    const gstNonFiler = this.normalizeGstRate(formValue.gstNonFiler);

    const itemData: any = this.pruneEmpty({
      // Company & Classification
      companyId: formValue.companyId,
      sellingGroup: formValue.sellingGroup,
      formulaId: formValue.formulaId,
      formulaSizeId: formValue.formulaSizeId,
      categoryId: formValue.categoryId,
      category: this.resolveCategoryName(formValue.categoryId),
      subCategoryId: formValue.subCategoryId,
      businessTypeId: formValue.businessTypeId,
      supplier: formValue.mainSupplierId ? {
        primarySupplierId: formValue.mainSupplierId
      } : undefined,

      // Basic Info
      code: formValue.code?.trim(),
      name: formValue.name?.trim(),
      unit: formValue.unit,
      productImage: formValue.image,
      isActive: formValue.isActive,

      // Packaging / measurement
      carton: {
        size: {
          length: this.toNumber(formValue.cartonLength),
          width: this.toNumber(formValue.cartonWidth),
          height: this.toNumber(formValue.cartonHeight)
        },
        unitsInCarton: this.toNumber(formValue.unitsInCarton),
        boxInCarton: this.toNumber(formValue.boxesInCarton),
        weight: this.toNumber(formValue.cartonWeight)
      },
      box: {
        unitsInBox: this.toNumber(formValue.unitsInBox),
        weight: this.toNumber(formValue.boxWeight)
      },
      unitWeight: this.toNumber(formValue.unitWeight),

      // Multi-level Pricing
      pricing: {
        purchasePrice: this.toNumber(formValue.unitPurchaseTP),
        costPrice: this.toNumber(formValue.unitPurchaseTP),
        salePrice: this.toNumber(formValue.unitSaleTP),
        retailPrice: this.toNumber(formValue.unitRetailPrice),
        mrp: this.toNumber(formValue.unitRetailPrice),
        boxPurchasePrice: this.toNumber(formValue.boxPurchaseTP),
        boxSalePrice: this.toNumber(formValue.boxSaleTP),
        boxRetailPrice: this.toNumber(formValue.boxRetailPrice),
        cartonPurchasePrice: this.toNumber(formValue.cartonPurchaseTP),
        cartonSalePrice: this.toNumber(formValue.cartonSaleTP),
        goodsChargesOnUnit: this.toNumber(formValue.goodsChargesPerUnit),
        currency: 'PKR'
      },

      // Tax
      tax: {
        taxType: 'GST',
        taxCategory: 'standard',
        gstRate: gstFiler,
        gstRateNonFilter: gstNonFiler
      },

      // Stock Alerts
      inventory: {
        minimumStock: this.toNumber(formValue.minimumStock),
        maximumStock: this.toNumber(formValue.maximumStock),
        reorderPoint: this.toNumber(formValue.minimumStock),
        currentStock: this.isEditMode ? this.toNumber(this.data.item?.inventory?.currentStock) : 0,
        alertNoSalesDays: this.toNumber(formValue.noSalesAlertDays)
      },

      // Barcode
      barcode: formValue.barcode?.trim()
    }) || {};

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
        const serverMessage = error?.error?.error?.message || error?.error?.message || 'Unknown error';
        this.toastService.error('Failed to save item: ' + serverMessage);
        this.saving = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get netPrices() {
    return this.calculateNetPrices();
  }

  private resolveId(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id || '';
  }

  private looksLikeObjectId(value: any): value is string {
    return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private normalizeGstRate(value: any): 0 | 4 | 18 {
    const n = this.toNumber(value);
    if (n === 4) return 4;
    if (n === 18) return 18;
    return 0;
  }

  private resolveCategoryName(categoryId: string): string | undefined {
    const category = this.categories.find((c: any) => c?._id === categoryId);
    return category?.name;
  }

  private pruneEmpty<T>(value: T): T {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.pruneEmpty(item))
        .filter((item) => item !== undefined && item !== null) as T;
    }

    if (value && typeof value === 'object') {
      const pruned: any = {};
      Object.entries(value as Record<string, any>).forEach(([key, val]) => {
        const cleaned = this.pruneEmpty(val);
        if (cleaned !== undefined && cleaned !== null && cleaned !== '') {
          pruned[key] = cleaned;
        }
      });
      return (Object.keys(pruned).length ? pruned : undefined) as T;
    }

    return value;
  }
}
