import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { StockTransferComponent } from './stock-transfer.component';
import { InventoryService } from '../../services/inventory.service';
import { WarehouseService } from '../../../warehouses/services/warehouse.service';
import { ItemService } from '../../../items/services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';

describe('StockTransferComponent', () => {
  let component: StockTransferComponent;
  let fixture: ComponentFixture<StockTransferComponent>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let warehouseService: jasmine.SpyObj<WarehouseService>;
  let itemService: jasmine.SpyObj<ItemService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const mockWarehouses = [
    { _id: 'wh1', code: 'WH001', name: 'Main Warehouse', isActive: true },
    { _id: 'wh2', code: 'WH002', name: 'Branch Warehouse', isActive: true }
  ];

  const mockItems = [
    {
      _id: 'item1',
      code: 'ITM001',
      name: 'Test Item 1',
      packingConfig: {
        cartonToBoxes: 10,
        boxToUnits: 100,
        unitName: 'Pieces'
      }
    },
    {
      _id: 'item2',
      code: 'ITM002',
      name: 'Test Item 2',
      packingConfig: {
        cartonToBoxes: 5,
        boxToUnits: 50,
        unitName: 'Units'
      }
    }
  ];

  const mockTransfers = [
    {
      _id: 'transfer1',
      transferNumber: 'TRF001',
      transferDate: '2025-01-15',
      itemId: 'item1',
      itemName: 'Test Item 1',
      fromWarehouseId: 'wh1',
      fromWarehouseName: 'Main Warehouse',
      toWarehouseId: 'wh2',
      toWarehouseName: 'Branch Warehouse',
      quantities: {
        qtyCtn: 2,
        qtyBox: 5,
        qtyUnit: 50,
        totalUnitQty: 2550
      },
      status: 'pending',
      createdBy: 'user1',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z'
    }
  ];

  beforeEach(async () => {
    const inventoryServiceSpy = jasmine.createSpyObj('InventoryService', [
      'getTransfers',
      'createTransfer',
      'updateTransferStatus'
    ]);
    const warehouseServiceSpy = jasmine.createSpyObj('WarehouseService', ['getWarehouses']);
    const itemServiceSpy = jasmine.createSpyObj('ItemService', ['getItems']);
    const toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info']);

    await TestBed.configureTestingModule({
      imports: [
        StockTransferComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        BrowserAnimationsModule,
        MatDialogModule
      ],
      providers: [
        { provide: InventoryService, useValue: inventoryServiceSpy },
        { provide: WarehouseService, useValue: warehouseServiceSpy },
        { provide: ItemService, useValue: itemServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    inventoryService = TestBed.inject(InventoryService) as jasmine.SpyObj<InventoryService>;
    warehouseService = TestBed.inject(WarehouseService) as jasmine.SpyObj<WarehouseService>;
    itemService = TestBed.inject(ItemService) as jasmine.SpyObj<ItemService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;

    // Setup default spy returns
    warehouseService.getWarehouses.and.returnValue(of({ success: true, data: mockWarehouses }));
    itemService.getItems.and.returnValue(of({ success: true, data: mockItems }));
    inventoryService.getTransfers.and.returnValue(of({
      success: true,
      data: mockTransfers,
      pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 25 }
    }));

    fixture = TestBed.createComponent(StockTransferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.transferForm).toBeDefined();
    expect(component.transferForm.get('transferDate')?.value).toBeInstanceOf(Date);
    expect(component.transferForm.get('qtyCtn')?.value).toBe(0);
    expect(component.transferForm.get('qtyBox')?.value).toBe(0);
    expect(component.transferForm.get('qtyUnit')?.value).toBe(0);
    expect(component.transferForm.get('status')?.value).toBe('pending');
  });

  it('should load warehouses on init', () => {
    expect(warehouseService.getWarehouses).toHaveBeenCalledWith({ isActive: true, limit: 1000 });
    expect(component.warehouses.length).toBe(2);
    expect(component.warehouses[0].name).toBe('Main Warehouse');
  });

  it('should load items on init', () => {
    expect(itemService.getItems).toHaveBeenCalledWith({ isActive: true, limit: 1000 });
    expect(component.items.length).toBe(2);
    expect(component.items[0].name).toBe('Test Item 1');
  });

  it('should load transfers on init', () => {
    expect(inventoryService.getTransfers).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.totalItems).toBe(1);
  });

  describe('Quantity Calculation', () => {
    it('should calculate total unit quantity correctly', () => {
      component.transferForm.patchValue({
        itemId: 'item1',
        qtyCtn: 2,
        qtyBox: 5,
        qtyUnit: 50
      });

      // Item1: cartonToBoxes=10, boxToUnits=100
      // Total = (2 * 10 * 100) + (5 * 100) + 50 = 2000 + 500 + 50 = 2550
      expect(component.transferForm.get('totalUnitQty')?.value).toBe(2550);
    });

    it('should recalculate when carton quantity changes', () => {
      component.transferForm.patchValue({
        itemId: 'item1',
        qtyCtn: 1,
        qtyBox: 0,
        qtyUnit: 0
      });

      // Total = (1 * 10 * 100) = 1000
      expect(component.transferForm.get('totalUnitQty')?.value).toBe(1000);
    });

    it('should recalculate when box quantity changes', () => {
      component.transferForm.patchValue({
        itemId: 'item1',
        qtyCtn: 0,
        qtyBox: 3,
        qtyUnit: 0
      });

      // Total = (3 * 100) = 300
      expect(component.transferForm.get('totalUnitQty')?.value).toBe(300);
    });

    it('should handle items without packing config', () => {
      const itemWithoutConfig = { _id: 'item3', code: 'ITM003', name: 'Item 3' };
      component.items.push(itemWithoutConfig);

      component.transferForm.patchValue({
        itemId: 'item3',
        qtyCtn: 2,
        qtyBox: 3,
        qtyUnit: 5
      });

      // Without packing config, should use 1:1 ratio
      expect(component.transferForm.get('totalUnitQty')?.value).toBe(10);
    });
  });

  describe('Form Validation', () => {
    it('should require all mandatory fields', () => {
      expect(component.transferForm.valid).toBeFalsy();

      component.transferForm.patchValue({
        transferDate: new Date(),
        itemId: 'item1',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        status: 'pending'
      });

      expect(component.transferForm.valid).toBeTruthy();
    });

    it('should validate that source and destination warehouses are different', () => {
      component.transferForm.patchValue({
        transferDate: new Date(),
        itemId: 'item1',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh1',
        status: 'pending'
      });

      expect(component.transferForm.errors?.['sameWarehouse']).toBeTruthy();
    });

    it('should not show warehouse error when warehouses are different', () => {
      component.transferForm.patchValue({
        transferDate: new Date(),
        itemId: 'item1',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        status: 'pending'
      });

      expect(component.transferForm.errors?.['sameWarehouse']).toBeFalsy();
    });
  });

  describe('Form Submission', () => {
    it('should not submit if form is invalid', () => {
      component.onSubmit();

      expect(inventoryService.createTransfer).not.toHaveBeenCalled();
      expect(toastService.error).toHaveBeenCalled();
    });

    it('should not submit if total quantity is zero', () => {
      component.transferForm.patchValue({
        transferDate: new Date(),
        itemId: 'item1',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        qtyCtn: 0,
        qtyBox: 0,
        qtyUnit: 0,
        status: 'pending'
      });

      component.onSubmit();

      expect(inventoryService.createTransfer).not.toHaveBeenCalled();
      expect(toastService.error).toHaveBeenCalledWith('Please enter a valid quantity');
    });

    it('should create transfer successfully', () => {
      inventoryService.createTransfer.and.returnValue(of({
        success: true,
        data: mockTransfers[0]
      }));

      component.transferForm.patchValue({
        transferDate: new Date(),
        itemId: 'item1',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        qtyCtn: 2,
        qtyBox: 5,
        qtyUnit: 50,
        status: 'pending'
      });

      component.onSubmit();

      expect(inventoryService.createTransfer).toHaveBeenCalled();
      expect(toastService.success).toHaveBeenCalledWith('Stock transfer created successfully');
    });

    it('should handle create transfer error', () => {
      inventoryService.createTransfer.and.returnValue(
        throwError(() => ({ error: { message: 'Insufficient stock' } }))
      );

      component.transferForm.patchValue({
        transferDate: new Date(),
        itemId: 'item1',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2',
        qtyCtn: 2,
        status: 'pending'
      });

      component.onSubmit();

      expect(toastService.error).toHaveBeenCalledWith('Insufficient stock');
    });
  });

  describe('Transfer Actions', () => {
    it('should edit transfer', () => {
      const transfer = mockTransfers[0];
      component.editTransfer(transfer);

      expect(component.editMode).toBeTruthy();
      expect(component.editingTransferId).toBe(transfer._id);
      expect(component.transferForm.get('itemId')?.value).toBe(transfer.itemId);
    });

    it('should receive in-transit transfer', () => {
      const transfer = { ...mockTransfers[0], status: 'in_transit' as const };
      inventoryService.updateTransferStatus.and.returnValue(of({
        success: true,
        data: { ...transfer, status: 'completed' as const }
      }));

      spyOn(window, 'confirm').and.returnValue(true);
      component.receiveTransfer(transfer);

      expect(inventoryService.updateTransferStatus).toHaveBeenCalledWith(transfer._id, 'completed');
      expect(toastService.success).toHaveBeenCalledWith('Transfer received successfully');
    });

    it('should not receive non-transit transfer', () => {
      const transfer = mockTransfers[0]; // status is 'pending'
      component.receiveTransfer(transfer);

      expect(inventoryService.updateTransferStatus).not.toHaveBeenCalled();
      expect(toastService.error).toHaveBeenCalledWith('Only in-transit transfers can be received');
    });

    it('should reset form', () => {
      component.transferForm.patchValue({
        itemId: 'item1',
        fromWarehouseId: 'wh1',
        toWarehouseId: 'wh2'
      });
      component.editMode = true;
      component.editingTransferId = 'transfer1';

      component.resetForm();

      expect(component.transferForm.get('itemId')?.value).toBe('');
      expect(component.editMode).toBeFalsy();
      expect(component.editingTransferId).toBeNull();
    });
  });

  describe('Helper Methods', () => {
    it('should format date correctly', () => {
      const date = '2025-01-15T10:00:00Z';
      const formatted = component.formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should format number correctly', () => {
      expect(component.formatNumber(1000)).toBe('1,000');
      expect(component.formatNumber(2550)).toBe('2,550');
    });

    it('should get correct status class', () => {
      expect(component.getStatusClass('pending')).toBe('status-pending');
      expect(component.getStatusClass('in_transit')).toBe('status-in-transit');
      expect(component.getStatusClass('completed')).toBe('status-completed');
      expect(component.getStatusClass('cancelled')).toBe('status-cancelled');
    });

    it('should get correct status label', () => {
      expect(component.getStatusLabel('pending')).toBe('Pending');
      expect(component.getStatusLabel('in_transit')).toBe('In Transit');
      expect(component.getStatusLabel('completed')).toBe('Completed');
      expect(component.getStatusLabel('cancelled')).toBe('Cancelled');
    });

    it('should get form title based on edit mode', () => {
      expect(component.formTitle).toBe('Create Stock Transfer');
      
      component.editMode = true;
      expect(component.formTitle).toBe('Edit Stock Transfer');
    });

    it('should get submit button text based on edit mode', () => {
      expect(component.submitButtonText).toBe('Save Transfer');
      
      component.editMode = true;
      expect(component.submitButtonText).toBe('Update Transfer');
    });
  });

  describe('Pagination', () => {
    it('should handle page change', () => {
      const event = { pageSize: 50, pageIndex: 1 };
      component.onPageChange(event);

      expect(component.pageSize).toBe(50);
      expect(component.pageIndex).toBe(1);
      expect(inventoryService.getTransfers).toHaveBeenCalled();
    });
  });
});
