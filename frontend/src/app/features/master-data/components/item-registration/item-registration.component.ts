import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ItemMasterService, Item } from '../../services/item-master.service';
import { CompanyMasterService, Company } from '../../services/company-master.service';
import { SupportingMasterService, Category, SubCategory, Formula, FormulaSize, BusinessType, CompanyGroup } from '../../services/supporting-master.service';

const optionalId = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const toBackendUnit = (value: unknown): string => {
  const key = String(value || '').trim().toUpperCase();
  const units: Record<string, string> = {
    PCS: 'piece',
    PIECE: 'piece',
    PIECES: 'piece',
    BOX: 'box',
    PACK: 'pack',
    STRIP: 'strip',
    BOTTLE: 'bottle',
    VIAL: 'bottle',
    TABLET: 'tablet',
    CAPSULE: 'capsule',
    KG: 'kg',
    GRAM: 'gram',
    LITER: 'liter',
    ML: 'ml'
  };
  return units[key] || 'piece';
};

@Component({
  selector: 'app-item-registration',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule, MatPaginatorModule,
  ],
  templateUrl: './item-registration.component.html',
  styleUrl: './item-registration.component.scss'
})
export class ItemRegistrationComponent implements OnInit {
  itemForm!: FormGroup;
  saving = false;
  editingId: string | null = null;

  // Lookups
  companies: Company[] = [];
  categories: Category[] = [];
  subCategories: SubCategory[] = [];
  formulas: Formula[] = [];
  formulaSizes: FormulaSize[] = [];
  businessTypes: BusinessType[] = [];
  companyGroups: CompanyGroup[] = [];

  // List
  displayedColumns = ['sno', 'code', 'name', 'company', 'category', 'purchasePrice', 'salePrice', 'stock', 'status', 'actions'];
  dataSource = new MatTableDataSource<Item>([]);
  loading = false;
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;

  constructor(
    private fb: FormBuilder,
    private itemService: ItemMasterService,
    private companyService: CompanyMasterService,
    private supportingService: SupportingMasterService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadMasterData();
    this.loadItems();
  }

  initForm(): void {
    this.itemForm = this.fb.group({
      // Basic Information
      name: ['', Validators.required],
      code: [''],
      description: [''],
      companyId: ['', Validators.required],
      companyGroupId: [''],
      formulaId: [''],
      formulaSizeId: [''],
      categoryId: ['', Validators.required],
      subCategoryId: [''],
      businessTypeId: ['', Validators.required],
      supplierId: [''],

      // Unit Pricing
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      costPrice: [0, Validators.min(0)],
      salePrice: [0, [Validators.required, Validators.min(0)]],
      tradePrice: [0, Validators.min(0)],
      retailPrice: [0, Validators.min(0)],
      wholesalePrice: [0, Validators.min(0)],
      distributorPrice: [0, Validators.min(0)],
      mrp: [0, Validators.min(0)],
      goodsChargesOnUnit: [0, Validators.min(0)],

      // Box/Dozen Pricing
      boxPurchasePrice: [0, Validators.min(0)],
      boxSalePrice: [0, Validators.min(0)],
      boxRetailPrice: [0, Validators.min(0)],

      // Carton Pricing
      cartonPurchasePrice: [0, Validators.min(0)],
      cartonSalePrice: [0, Validators.min(0)],

      // Packaging
      cartonLength: [0, Validators.min(0)],
      cartonWidth: [0, Validators.min(0)],
      cartonHeight: [0, Validators.min(0)],
      unitsInCarton: [0, Validators.min(0)],
      boxInCarton: [0, Validators.min(0)],
      unitsInBox: [0, Validators.min(0)],
      cartonWeight: [0, Validators.min(0)],
      boxWeight: [0, Validators.min(0)],
      unitWeight: [0, Validators.min(0)],

      // Inventory
      openingStock: [0, Validators.min(0)],
      minStockLevel: [0, Validators.min(0)],
      maxStockLevel: [0, Validators.min(0)],
      reorderPoint: [0, Validators.min(0)],
      leadTime: [0, Validators.min(0)],
      alertNoSalesDays: [0, Validators.min(0)],

      // Tax
      taxType: ['GST'],
      gstRate: [18, Validators.min(0)],
      gstRateNonFilter: [0, Validators.min(0)],
      whtRate: [0, Validators.min(0)],
      hsnCode: [''],

      // Specifications
      unitOfMeasurement: ['PCS', Validators.required],
      packingSize: [1, Validators.min(1)],
      batchTracking: [true],
      expiryTracking: [true],
      barcode: [''],

      // Status
      isActive: [true]
    });
  }

  loadMasterData(): void {
    this.companyService.getCompanies({ isActive: true }).subscribe({
      next: (res) => { if (res.success) this.companies = res.data; }
    });

    this.supportingService.getCategories({ isActive: true }).subscribe({
      next: (res) => { if (res.success) this.categories = res.data; }
    });

    this.supportingService.getFormulas({ isActive: true }).subscribe({
      next: (res) => { if (res.success) this.formulas = res.data; }
    });

    this.supportingService.getBusinessTypes({ isActive: true }).subscribe({
      next: (res) => { if (res.success) this.businessTypes = res.data; }
    });

    this.supportingService.getCompanyGroups({ isActive: true }).subscribe({
      next: (res) => { if (res.success) this.companyGroups = res.data; }
    });
  }

  onCategoryChange(categoryId: string): void {
    if (categoryId) {
      this.supportingService.getSubCategoriesByCategory(categoryId).subscribe({
        next: (res) => { if (res.success) this.subCategories = res.data; }
      });
    } else {
      this.subCategories = [];
      this.itemForm.patchValue({ subCategoryId: '' });
    }
  }

  onCompanyChange(companyId: string): void {
    if (companyId) {
      this.supportingService.getCompanyGroupsByCompany(companyId).subscribe({
        next: (res) => { if (res.success) this.companyGroups = res.data; }
      });
    } else {
      this.companyGroups = [];
      this.itemForm.patchValue({ companyGroupId: '' });
    }
  }

  onFormulaChange(formulaId: string): void {
    if (formulaId) {
      this.supportingService.getFormulaSizesByFormula(formulaId).subscribe({
        next: (res) => { if (res.success) this.formulaSizes = res.data; }
      });
    } else {
      this.formulaSizes = [];
      this.itemForm.patchValue({ formulaSizeId: '' });
    }
  }

  loadItems(): void {
    this.loading = true;
    this.itemService.getItems({ page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
      next: (res) => {
        this.loading = false;
        this.dataSource.data = res.data || [];
        this.totalItems = res.pagination?.totalItems || res.data?.length || 0;
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    const fv = this.itemForm.value;

    const unit = toBackendUnit(fv.unitOfMeasurement);
    const itemData: any = {
      name: fv.name,
      code: fv.code,
      description: fv.description,
      companyId: fv.companyId,
      companyGroupId: optionalId(fv.companyGroupId),
      formulaId: optionalId(fv.formulaId),
      formulaSizeId: optionalId(fv.formulaSizeId),
      categoryId: fv.categoryId,
      subCategoryId: optionalId(fv.subCategoryId),
      businessTypeId: fv.businessTypeId,
      supplierId: optionalId(fv.supplierId),
      unit,
      packSize: Number(fv.packingSize) || 1,

      pricing: {
        purchasePrice: fv.purchasePrice,
        boxPurchasePrice: fv.boxPurchasePrice,
        cartonPurchasePrice: fv.cartonPurchasePrice,
        costPrice: fv.costPrice,
        salePrice: fv.salePrice,
        boxSalePrice: fv.boxSalePrice,
        cartonSalePrice: fv.cartonSalePrice,
        tradePrice: fv.tradePrice,
        retailPrice: fv.retailPrice,
        boxRetailPrice: fv.boxRetailPrice,
        wholesalePrice: fv.wholesalePrice,
        distributorPrice: fv.distributorPrice,
        mrp: fv.mrp,
        goodsChargesOnUnit: fv.goodsChargesOnUnit
      },

      inventory: {
        openingStock: fv.openingStock,
        currentStock: this.editingId ? undefined : fv.openingStock,
        minStockLevel: fv.minStockLevel,
        maxStockLevel: fv.maxStockLevel,
        reorderPoint: fv.reorderPoint,
        leadTime: fv.leadTime,
        alertNoSalesDays: fv.alertNoSalesDays
      },

      tax: {
        taxType: fv.taxType,
        taxPercentage: fv.gstRate,
        gstRate: fv.gstRate,
        gstRateNonFilter: fv.gstRateNonFilter,
        whtRate: fv.whtRate,
        hsnCode: fv.hsnCode
      },

      specifications: {
        unitOfMeasurement: fv.unitOfMeasurement,
        packingSize: fv.packingSize,
        batchTracking: fv.batchTracking,
        expiryTracking: fv.expiryTracking,
        barcode: fv.barcode
      },

      carton: {
        size: { length: fv.cartonLength, width: fv.cartonWidth, height: fv.cartonHeight },
        unitsInCarton: fv.unitsInCarton,
        boxInCarton: fv.boxInCarton,
        weight: fv.cartonWeight
      },

      box: {
        unitsInBox: fv.unitsInBox,
        weight: fv.boxWeight
      },

      unitWeight: fv.unitWeight,
      isActive: fv.isActive
    };

    const request$ = this.editingId
      ? this.itemService.updateItem(this.editingId, itemData)
      : this.itemService.createItem(itemData);

    request$.subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success) {
          this.snackBar.open(`Item ${this.editingId ? 'updated' : 'created'} successfully`, 'Close', { duration: 3000 });
          this.resetForm();
          this.loadItems();
        }
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Failed to save item', 'Close', { duration: 3000 });
      }
    });
  }

  edit(item: Item): void {
    this.editingId = item._id;
    this.itemForm.patchValue({
      name: item.name,
      code: item.code,
      description: item.description,
      companyId: item.companyId,
      companyGroupId: item.companyGroupId,
      formulaId: item.formulaId,
      formulaSizeId: item.formulaSizeId,
      categoryId: item.categoryId,
      subCategoryId: item.subCategoryId,
      businessTypeId: item.businessTypeId,
      supplierId: item.supplierId,

      purchasePrice: item.pricing?.purchasePrice || 0,
      boxPurchasePrice: item.pricing?.boxPurchasePrice || 0,
      cartonPurchasePrice: item.pricing?.cartonPurchasePrice || 0,
      costPrice: item.pricing?.costPrice || 0,
      salePrice: item.pricing?.salePrice || 0,
      boxSalePrice: item.pricing?.boxSalePrice || 0,
      cartonSalePrice: item.pricing?.cartonSalePrice || 0,
      tradePrice: item.pricing?.tradePrice || 0,
      retailPrice: item.pricing?.retailPrice || 0,
      boxRetailPrice: item.pricing?.boxRetailPrice || 0,
      wholesalePrice: item.pricing?.wholesalePrice || 0,
      distributorPrice: item.pricing?.distributorPrice || 0,
      mrp: item.pricing?.mrp || 0,
      goodsChargesOnUnit: item.pricing?.goodsChargesOnUnit || 0,

      cartonLength: item.carton?.size?.length || 0,
      cartonWidth: item.carton?.size?.width || 0,
      cartonHeight: item.carton?.size?.height || 0,
      unitsInCarton: item.carton?.unitsInCarton || 0,
      boxInCarton: item.carton?.boxInCarton || 0,
      cartonWeight: item.carton?.weight || 0,
      unitsInBox: item.box?.unitsInBox || 0,
      boxWeight: item.box?.weight || 0,
      unitWeight: item.unitWeight || 0,

      openingStock: item.inventory?.openingStock || 0,
      minStockLevel: item.inventory?.minStockLevel || 0,
      maxStockLevel: item.inventory?.maxStockLevel || 0,
      reorderPoint: item.inventory?.reorderPoint || 0,
      leadTime: item.inventory?.leadTime || 0,
      alertNoSalesDays: item.inventory?.alertNoSalesDays || 0,

      taxType: item.tax?.taxType || 'GST',
      gstRate: item.tax?.gstRate || 18,
      gstRateNonFilter: item.tax?.gstRateNonFilter || 0,
      whtRate: item.tax?.whtRate || 0,
      hsnCode: item.tax?.hsnCode || '',

      unitOfMeasurement: item.specifications?.unitOfMeasurement || 'PCS',
      packingSize: item.specifications?.packingSize || 1,
      batchTracking: item.specifications?.batchTracking ?? true,
      expiryTracking: item.specifications?.expiryTracking ?? true,
      barcode: item.specifications?.barcode || '',
      isActive: item.isActive
    });

    if (item.categoryId) this.onCategoryChange(item.categoryId);
    if (item.formulaId) this.onFormulaChange(item.formulaId);
    if (item.companyId) this.onCompanyChange(item.companyId);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  delete(item: Item): void {
    if (!confirm(`Delete item "${item.name}"?`)) return;
    this.itemService.deleteItem(item._id).subscribe({
      next: () => {
        this.snackBar.open('Item deleted', 'Close', { duration: 2000 });
        this.loadItems();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Failed to delete', 'Close', { duration: 3000 });
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.itemForm.reset({
      taxType: 'GST',
      gstRate: 18,
      gstRateNonFilter: 0,
      whtRate: 0,
      unitOfMeasurement: 'PCS',
      packingSize: 1,
      batchTracking: true,
      expiryTracking: true,
      isActive: true
    });
    this.subCategories = [];
    this.formulaSizes = [];
  }

  cancelEdit(): void {
    this.resetForm();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadItems();
  }

  getCompanyName(id: string): string {
    const c = this.companies.find(x => x._id === id);
    return c?.name || id || '—';
  }

  getCategoryName(id: string): string {
    const c = this.categories.find(x => x._id === id);
    return c?.name || id || '—';
  }

  fmtNum(n: number): string {
    return n ? n.toLocaleString('en-PK') : '—';
  }

  private optionalId(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private toBackendUnit(value: unknown): string {
    const key = String(value || '').trim().toUpperCase();
    const units: Record<string, string> = {
      PCS: 'piece',
      PIECE: 'piece',
      PIECES: 'piece',
      BOX: 'box',
      PACK: 'pack',
      STRIP: 'strip',
      BOTTLE: 'bottle',
      VIAL: 'bottle',
      TABLET: 'tablet',
      CAPSULE: 'capsule',
      KG: 'kg',
      GRAM: 'gram',
      LITER: 'liter',
      ML: 'ml'
    };
    return units[key] || 'piece';
  }
}
