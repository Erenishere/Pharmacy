import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { StockAdjustmentComponent } from './stock-adjustment.component';
import { InventoryService } from '../../services/inventory.service';
import { WarehouseService } from '../../../warehouses/services/warehouse.service';
import { ItemService } from '../../../items/services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';

describe('StockAdjustmentComponent', () => {
  let component: StockAdjustmentComponent;
  let fixture: ComponentFixture<StockAdjustmentComponent>;
  let mockInventoryService: jasmine.SpyObj<InventoryService>;
  let mockWarehouseService: jasmine.SpyObj<WarehouseService>;
  let mockItemService: jasmine.SpyObj<ItemService>;
  let mockToastService: jasmine.SpyObj<ToastService>;

  const mockWarehouses = [
    { _id: 'wh1', name: 'Main Warehouse', code: 'WH001', isActive: true },
    { _id: 'wh2', name: 'Branch Warehouse', code: 'WH002', isActive: true }
  ];

  const mockItems = [
    { 
      _id: 'item1', 
      code: 'ITM001', 
      name: 'Test Item 1',
      packingConfig: { cartonToBoxes: 10, boxToUnits: 100, unitName: 'Units' }
    },
    { 
      _id: 'item2', 
      code: 'ITM002', 
      name: 'Test Item 2',
      packingConfig: { cartonToBoxes: 5, boxToUnits: 50, unitName: 'Pieces' }
    }
  ];

  const mockAdjustments = [
    {
      _id: 'adj1',
      adjustmentNumber: 'ADJ001',
      adjustmentDate: '2025-01-15',
      itemId: 'item1',
      itemName: 'Test Item 1',
      warehouseId: 'wh1',
      warehouseName: 'Main Warehouse',
      adjustmentType: 'increase' as const,
      quantity: 100,
      reason: 'physical_count',
      notes: 'Physical count correction',
      status: 'pending' as const,
      createdBy: 'user1',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z'
    }
  ];

  const mockStockLevel = {
    _id: 'stock1',
    itemId: 'item1',
    itemCode: 'ITM001',
    itemName: 'Test Item 1',
    warehouseId: 'wh1',
    warehouseName: 'Main Warehouse',
    quantity: 500,
    reservedQuantity: 50,
    availableQuantity: 450,
    lastUpdated: '2025-01-15T10:00:00Z'
  };

  beforeEach(async () => {
    mockInventoryService = jasmine.createSpyObj('InventoryService', [
      'getAdjustments',
      'createAdjustment',
      'approveAdjustment',
      'rejectAdjustment',
      'getStockLevels'
    ]);
    mockWarehouseService = jasmine.createSpyObj('WarehouseService', ['getWarehouses']);
    mockItemService = jasmine.createSpyObj('ItemService', ['getItems']);
    mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error', 'info']);

    await TestBed.configureTestingModule({
      imports: [
        StockAdjustmentComponent,
        ReactiveFormsModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: WarehouseService, useValue: mockWarehouseService },
        { provide: ItemService, useValue: mockItemService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    mockWarehouseService.getWarehouses.and.returnValue(of({ 
      success: true, 
      data: mockWarehouses 
    }));
    mockItemService.getItems.and.returnValue(of({ 
      success: true, 
      data: mockItems 
    }));
    mockInventoryService.getAdjustments.and.returnValue(of({ 
      success: true, 
      data: mockAdjustments,
      pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 25 }
    }));

    fixture = TestBed.createComponent(StockAdjustmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.adjustmentForm).toBeDefined();
    expect(component.adjustmentForm.get('adjustmentType')?.value).toBe('increase');
    expect(component.adjustmentForm.get('quantity')?.value).toBe(0);
  });

  it('should load warehouses on init', () => {
    expect(mockWarehouseService.getWarehouses).toHaveBeenCalled();
    expect(component.warehouses.length).toBe(2);
    expect(component.warehouses[0].name).toBe('Main Warehouse');
  });

  it('should load items on init', () => {
    expect(mockItemService.getItems).toHaveBeenCalled();
    expect(component.items.length).toBe(2);
    expect(component.items[0].name).toBe('Test Item 1');
  });

  it('should load adjustments on init', () => {
    expect(mockInventoryService.getAdjustments).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].adjustmentNumber).toBe('ADJ001');
  });

  it('should load current stock when item and warehouse are selected', (done) => {
    mockInventoryService.getStockLevels.and.returnValue(of({
      success: true,
      data: [mockStockLevel]
    }));

    component.adjustmentForm.patchValue({
      itemId: 'item1',
      warehouseId: 'wh1'
    });

    setTimeout(() => {
      expect(mockInventoryService.getStockLevels).toHaveBeenCalledWith({
        itemId: 'item1',
        warehouseId: 'wh1',
        limit: 1
      });
      expect(component.currentStock).toBeDefined();
      expect(component.currentStock?.quantity).toBe(500);
      expect(component.currentStock?.availableQuantity).toBe(450);
      done();
    }, 400);
  });

  it('should validate form before submission', () => {
    component.onSubmit();
    expect(mockToastService.error).toHaveBeenCalledWith('Please fill in all required fields');
    expect(mockInventoryService.createAdjustment).not.toHaveBeenCalled();
  });

  it('should create adjustment with valid data', () => {
    mockInventoryService.createAdjustment.and.returnValue(of({
      success: true,
      data: mockAdjustments[0]
    }));

    component.adjustmentForm.patchValue({
      adjustmentDate: new Date('2025-01-15'),
      itemId: 'item1',
      warehouseId: 'wh1',
      adjustmentType: 'increase',
      quantity: 100,
      reason: 'physical_count',
      notes: 'Physical count correction'
    });

    component.onSubmit();

    expect(mockInventoryService.createAdjustment).toHaveBeenCalledWith(
      jasmine.objectContaining({
        itemId: 'item1',
        warehouseId: 'wh1',
        adjustmentType: 'increase',
        quantity: 100,
        reason: 'physical_count',
        notes: 'Physical count correction'
      })
    );
    expect(mockToastService.success).toHaveBeenCalledWith('Stock adjustment created successfully');
  });

  it('should prevent decrease adjustment exceeding available quantity', () => {
    component.currentStock = {
      quantity: 500,
      reservedQuantity: 50,
      availableQuantity: 450
    };

    component.adjustmentForm.patchValue({
      adjustmentDate: new Date('2025-01-15'),
      itemId: 'item1',
      warehouseId: 'wh1',
      adjustmentType: 'decrease',
      quantity: 500, // More than available
      reason: 'damage',
      notes: 'Damaged goods'
    });

    component.onSubmit();

    expect(mockToastService.error).toHaveBeenCalledWith(
      'Cannot decrease by 500. Available quantity is 450'
    );
    expect(mockInventoryService.createAdjustment).not.toHaveBeenCalled();
  });

  it('should calculate new stock level correctly for increase', () => {
    component.currentStock = {
      quantity: 500,
      reservedQuantity: 50,
      availableQuantity: 450
    };

    component.adjustmentForm.patchValue({
      adjustmentType: 'increase',
      quantity: 100
    });

    expect(component.newStockLevel).toBe(600);
  });

  it('should calculate new stock level correctly for decrease', () => {
    component.currentStock = {
      quantity: 500,
      reservedQuantity: 50,
      availableQuantity: 450
    };

    component.adjustmentForm.patchValue({
      adjustmentType: 'decrease',
      quantity: 100
    });

    expect(component.newStockLevel).toBe(400);
  });

  it('should approve adjustment', () => {
    mockInventoryService.approveAdjustment.and.returnValue(of({
      success: true,
      data: { ...mockAdjustments[0], status: 'approved' as const }
    }));

    spyOn(window, 'confirm').and.returnValue(true);

    component.approveAdjustment(mockAdjustments[0]);

    expect(mockInventoryService.approveAdjustment).toHaveBeenCalledWith('adj1');
    expect(mockToastService.success).toHaveBeenCalledWith('Adjustment approved successfully');
  });

  it('should not approve non-pending adjustment', () => {
    const approvedAdjustment = { ...mockAdjustments[0], status: 'approved' as const };
    
    component.approveAdjustment(approvedAdjustment);

    expect(mockToastService.error).toHaveBeenCalledWith('Only pending adjustments can be approved');
    expect(mockInventoryService.approveAdjustment).not.toHaveBeenCalled();
  });

  it('should reject adjustment with reason', () => {
    mockInventoryService.rejectAdjustment.and.returnValue(of({
      success: true,
      data: { ...mockAdjustments[0], status: 'rejected' as const }
    }));

    spyOn(window, 'prompt').and.returnValue('Incorrect count');

    component.rejectAdjustment(mockAdjustments[0]);

    expect(mockInventoryService.rejectAdjustment).toHaveBeenCalledWith('adj1', 'Incorrect count');
    expect(mockToastService.success).toHaveBeenCalledWith('Adjustment rejected');
  });

  it('should handle API errors gracefully', () => {
    mockInventoryService.createAdjustment.and.returnValue(
      throwError(() => ({ error: { message: 'Server error' } }))
    );

    component.adjustmentForm.patchValue({
      adjustmentDate: new Date('2025-01-15'),
      itemId: 'item1',
      warehouseId: 'wh1',
      adjustmentType: 'increase',
      quantity: 100,
      reason: 'physical_count',
      notes: 'Physical count correction'
    });

    component.onSubmit();

    expect(mockToastService.error).toHaveBeenCalledWith('Server error');
  });

  it('should reset form correctly', () => {
    component.adjustmentForm.patchValue({
      itemId: 'item1',
      warehouseId: 'wh1',
      quantity: 100,
      reason: 'damage',
      notes: 'Test notes'
    });

    component.resetForm();

    expect(component.adjustmentForm.get('itemId')?.value).toBe('');
    expect(component.adjustmentForm.get('warehouseId')?.value).toBe('');
    expect(component.adjustmentForm.get('adjustmentType')?.value).toBe('increase');
    expect(component.currentStock).toBeNull();
  });

  it('should format dates correctly', () => {
    const formatted = component.formatDate('2025-01-15T10:00:00Z');
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2025');
  });

  it('should format numbers correctly', () => {
    const formatted = component.formatNumber(1000);
    expect(formatted).toBe('1,000');
  });

  it('should get correct status class', () => {
    expect(component.getStatusClass('pending')).toBe('status-pending');
    expect(component.getStatusClass('approved')).toBe('status-approved');
    expect(component.getStatusClass('rejected')).toBe('status-rejected');
  });

  it('should get correct adjustment type class', () => {
    expect(component.getAdjustmentTypeClass('increase')).toBe('adjustment-increase');
    expect(component.getAdjustmentTypeClass('decrease')).toBe('adjustment-decrease');
  });

  it('should handle pagination changes', () => {
    const event = { pageSize: 50, pageIndex: 1 };
    component.onPageChange(event);

    expect(component.pageSize).toBe(50);
    expect(component.pageIndex).toBe(1);
    expect(mockInventoryService.getAdjustments).toHaveBeenCalled();
  });
});
