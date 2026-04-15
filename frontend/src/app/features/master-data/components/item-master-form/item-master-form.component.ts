import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { ItemMasterService, Item } from '../../services/item-master.service';
import { CompanyMasterService, Company } from '../../services/company-master.service';
import { SupportingMasterService, Category, SubCategory, Formula, FormulaSize, BusinessType } from '../../services/supporting-master.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-item-master-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTabsModule
  ],
  templateUrl: './item-master-form.component.html',
  styleUrl: './item-master-form.component.scss'
})
export class ItemMasterFormComponent implements OnInit {
  itemForm!: FormGroup;
  mode: 'create' | 'edit' = 'create';
  loading = false;

  companies: Company[] = [];
  categories: Category[] = [];
  subCategories: SubCategory[] = [];
  formulas: Formula[] = [];
  formulaSizes: FormulaSize[] = [];
  businessTypes: BusinessType[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ItemMasterFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private itemService: ItemMasterService,
    private companyService: CompanyMasterService,
    private supportingService: SupportingMasterService,
    private toastService: ToastService
  ) {
    this.mode = data.mode || 'create';
  }

  ngOnInit() {
    this.initForm();
    this.loadMasterData();

    if (this.mode === 'edit' && this.data.item) {
      this.populateForm(this.data.item);
    }
  }

  initForm() {
    this.itemForm = this.fb.group({
      name: ['', Validators.required],
      code: [''],
      description: [''],
      companyId: ['', Validators.required],
      sellingGroup: [''],
      formulaId: [''],
      formulaSizeId: [''],
      categoryId: [''],
      subCategoryId: [''],
      businessTypeId: [''],
      supplierId: [''],
      
      // Pricing
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      boxPurchasePrice: [0, Validators.min(0)],
      cartonPurchasePrice: [0, Validators.min(0)],
      costPrice: [0, Validators.min(0)],
      salePrice: [0, [Validators.required, Validators.min(0)]],
      boxSalePrice: [0, Validators.min(0)],
      cartonSalePrice: [0, Validators.min(0)],
      tradePrice: [0, Validators.min(0)],
      retailPrice: [0, Validators.min(0)],
      boxRetailPrice: [0, Validators.min(0)],
      wholesalePrice: [0, Validators.min(0)],
      distributorPrice: [0, Validators.min(0)],
      mrp: [0, Validators.min(0)],
      goodsChargesOnUnit: [0, Validators.min(0)],
      
      // Inventory
      openingStock: [0, Validators.min(0)],
      minStockLevel: [0, Validators.min(0)],
      maxStockLevel: [0, Validators.min(0)],
      reorderPoint: [0, Validators.min(0)],
      leadTime: [0, Validators.min(0)],
      alertNoSalesDays: [0, Validators.min(0)],
      
      // Tax
      taxType: ['GST'],
      taxPercentage: [18, Validators.min(0)],
      gstRate: [18, Validators.min(0)],
      gstRateNonFilter: [0, Validators.min(0)],
      whtRate: [0, Validators.min(0)],
      hsnCode: [''],
      
      // Specifications
      unitOfMeasurement: ['', Validators.required],
      packingSize: [1, Validators.min(1)],
      batchTracking: [true],
      expiryTracking: [true],
      barcode: [''],
      
      // Carton
      cartonLength: [0, Validators.min(0)],
      cartonWidth: [0, Validators.min(0)],
      cartonHeight: [0, Validators.min(0)],
      unitsInCarton: [0, Validators.min(0)],
      boxInCarton: [0, Validators.min(0)],
      cartonWeight: [0, Validators.min(0)],
      
      // Box
      unitsInBox: [0, Validators.min(0)],
      boxWeight: [0, Validators.min(0)],
      
      // Weight
      unitWeight: [0, Validators.min(0)],
      
      isActive: [true]
    });
  }

  loadMasterData() {
    this.companyService.getCompanies({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success) this.companies = response.data;
      }
    });

    this.supportingService.getCategories({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success) this.categories = response.data;
      }
    });

    this.supportingService.getFormulas({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success) this.formulas = response.data;
      }
    });

    this.supportingService.getBusinessTypes({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success) this.businessTypes = response.data;
      }
    });
  }

  onCategoryChange(categoryId: string) {
    if (categoryId) {
      this.supportingService.getSubCategoriesByCategory(categoryId).subscribe({
        next: (response) => {
          if (response.success) this.subCategories = response.data;
        }
      });
    } else {
      this.subCategories = [];
      this.itemForm.patchValue({ subCategoryId: '' });
    }
  }

  onFormulaChange(formulaId: string) {
    if (formulaId) {
      this.supportingService.getFormulaSizesByFormula(formulaId).subscribe({
        next: (response) => {
          if (response.success) this.formulaSizes = response.data;
        }
      });
    } else {
      this.formulaSizes = [];
      this.itemForm.patchValue({ formulaSizeId: '' });
    }
  }

  populateForm(item: Item) {
    this.itemForm.patchValue({
      name: item.name,
      code: item.code,
      description: item.description,
      companyId: item.companyId,
      sellingGroup: item.sellingGroup,
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
      
      openingStock: item.inventory?.openingStock || 0,
      minStockLevel: item.inventory?.minStockLevel || 0,
      maxStockLevel: item.inventory?.maxStockLevel || 0,
      reorderPoint: item.inventory?.reorderPoint || 0,
      leadTime: item.inventory?.leadTime || 0,
      alertNoSalesDays: item.inventory?.alertNoSalesDays || 0,
      
      taxType: item.tax?.taxType || 'GST',
      taxPercentage: item.tax?.taxPercentage || 18,
      gstRate: item.tax?.gstRate || 18,
      gstRateNonFilter: item.tax?.gstRateNonFilter || 0,
      whtRate: item.tax?.whtRate || 0,
      hsnCode: item.tax?.hsnCode || '',
      
      unitOfMeasurement: item.specifications?.unitOfMeasurement || '',
      packingSize: item.specifications?.packingSize || 1,
      batchTracking: item.specifications?.batchTracking ?? true,
      expiryTracking: item.specifications?.expiryTracking ?? true,
      barcode: item.specifications?.barcode || '',
      
      cartonLength: item.carton?.size?.length || 0,
      cartonWidth: item.carton?.size?.width || 0,
      cartonHeight: item.carton?.size?.height || 0,
      unitsInCarton: item.carton?.unitsInCarton || 0,
      boxInCarton: item.carton?.boxInCarton || 0,
      cartonWeight: item.carton?.weight || 0,
      
      unitsInBox: item.box?.unitsInBox || 0,
      boxWeight: item.box?.weight || 0,
      
      unitWeight: item.unitWeight || 0,
      
      isActive: item.isActive
    });

    if (item.categoryId) {
      this.onCategoryChange(item.categoryId);
    }
    if (item.formulaId) {
      this.onFormulaChange(item.formulaId);
    }
  }

  onSubmit() {
    if (this.itemForm.invalid) {
      this.toastService.error('Please fill all required fields');
      return;
    }

    this.loading = true;
    const formValue = this.itemForm.value;

    const itemData: Partial<Item> = {
      name: formValue.name,
      code: formValue.code,
      description: formValue.description,
      companyId: formValue.companyId,
      sellingGroup: formValue.sellingGroup,
      formulaId: formValue.formulaId,
      formulaSizeId: formValue.formulaSizeId,
      categoryId: formValue.categoryId,
      subCategoryId: formValue.subCategoryId,
      businessTypeId: formValue.businessTypeId,
      supplierId: formValue.supplierId,
      
      pricing: {
        purchasePrice: formValue.purchasePrice,
        boxPurchasePrice: formValue.boxPurchasePrice,
        cartonPurchasePrice: formValue.cartonPurchasePrice,
        costPrice: formValue.costPrice,
        salePrice: formValue.salePrice,
        boxSalePrice: formValue.boxSalePrice,
        cartonSalePrice: formValue.cartonSalePrice,
        tradePrice: formValue.tradePrice,
        retailPrice: formValue.retailPrice,
        boxRetailPrice: formValue.boxRetailPrice,
        wholesalePrice: formValue.wholesalePrice,
        distributorPrice: formValue.distributorPrice,
        mrp: formValue.mrp,
        goodsChargesOnUnit: formValue.goodsChargesOnUnit
      },
      
      inventory: {
        openingStock: formValue.openingStock,
        currentStock: this.mode === 'create' ? formValue.openingStock : this.data.item.inventory.currentStock,
        minStockLevel: formValue.minStockLevel,
        maxStockLevel: formValue.maxStockLevel,
        reorderPoint: formValue.reorderPoint,
        leadTime: formValue.leadTime,
        alertNoSalesDays: formValue.alertNoSalesDays
      },
      
      tax: {
        taxType: formValue.taxType,
        taxPercentage: formValue.taxPercentage,
        gstRate: formValue.gstRate,
        gstRateNonFilter: formValue.gstRateNonFilter,
        whtRate: formValue.whtRate,
        hsnCode: formValue.hsnCode
      },
      
      specifications: {
        unitOfMeasurement: formValue.unitOfMeasurement,
        packingSize: formValue.packingSize,
        batchTracking: formValue.batchTracking,
        expiryTracking: formValue.expiryTracking,
        barcode: formValue.barcode
      },
      
      carton: {
        size: {
          length: formValue.cartonLength,
          width: formValue.cartonWidth,
          height: formValue.cartonHeight
        },
        unitsInCarton: formValue.unitsInCarton,
        boxInCarton: formValue.boxInCarton,
        weight: formValue.cartonWeight
      },
      
      box: {
        unitsInBox: formValue.unitsInBox,
        weight: formValue.boxWeight
      },
      
      unitWeight: formValue.unitWeight,
      
      isActive: formValue.isActive
    };

    const request = this.mode === 'create'
      ? this.itemService.createItem(itemData)
      : this.itemService.updateItem(this.data.item._id, itemData);

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(`Item ${this.mode === 'create' ? 'created' : 'updated'} successfully`);
          this.dialogRef.close(true);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error saving item', err);
        this.toastService.error(`Failed to ${this.mode === 'create' ? 'create' : 'update'} item`);
        this.loading = false;
      }
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
