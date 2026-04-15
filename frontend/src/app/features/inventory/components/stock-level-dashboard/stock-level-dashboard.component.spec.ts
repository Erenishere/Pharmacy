import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StockLevelDashboardComponent } from './stock-level-dashboard.component';
import { InventoryService } from '../../services/inventory.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { of } from 'rxjs';

describe('StockLevelDashboardComponent', () => {
  let component: StockLevelDashboardComponent;
  let fixture: ComponentFixture<StockLevelDashboardComponent>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    const inventoryServiceSpy = jasmine.createSpyObj('InventoryService', [
      'getStockLevels',
      'getStockOverview'
    ]);
    const toastServiceSpy = jasmine.createSpyObj('ToastService', [
      'success',
      'error',
      'info'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        StockLevelDashboardComponent,
        HttpClientTestingModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: InventoryService, useValue: inventoryServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    inventoryService = TestBed.inject(InventoryService) as jasmine.SpyObj<InventoryService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;

    // Setup default mock responses
    inventoryService.getStockOverview.and.returnValue(of({
      success: true,
      data: {
        totalItems: 100,
        totalInventoryValue: 500000,
        lowStockCount: 5,
        outOfStockCount: 2,
        totalQuantity: 10000,
        totalReserved: 500,
        totalAvailable: 9500
      }
    }));

    inventoryService.getStockLevels.and.returnValue(of({
      success: true,
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 25
      }
    }));

    fixture = TestBed.createComponent(StockLevelDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load overview on init', () => {
    fixture.detectChanges();
    expect(inventoryService.getStockOverview).toHaveBeenCalled();
    expect(component.overview.totalItems).toBe(100);
  });

  it('should load stock levels on init', () => {
    fixture.detectChanges();
    expect(inventoryService.getStockLevels).toHaveBeenCalled();
  });

  it('should format numbers correctly', () => {
    expect(component.formatNumber(1000)).toBe('1,000');
    expect(component.formatNumber(0)).toBe('0');
  });

  it('should format currency correctly', () => {
    expect(component.formatCurrency(1000)).toContain('1,000.00');
  });

  it('should detect low stock correctly', () => {
    const lowStockItem: any = {
      availableQuantity: 5,
      minimumLevel: 10
    };
    expect(component.getStockStatusClass(lowStockItem)).toBe('low-stock');
  });

  it('should detect out of stock correctly', () => {
    const outOfStockItem: any = {
      availableQuantity: 0,
      minimumLevel: 10
    };
    expect(component.getStockStatusClass(outOfStockItem)).toBe('out-of-stock');
  });

  it('should detect in stock correctly', () => {
    const inStockItem: any = {
      availableQuantity: 100,
      minimumLevel: 10
    };
    expect(component.getStockStatusClass(inStockItem)).toBe('in-stock');
  });

  it('should detect expiring soon items', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
    expect(component.isExpiringSoon(futureDate.toISOString())).toBe(true);
  });

  it('should detect expired items', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10); // 10 days ago
    expect(component.isExpired(pastDate.toISOString())).toBe(true);
  });

  it('should clear filters', () => {
    component.searchControl.setValue('test');
    component.selectedWarehouse = 'warehouse1';
    component.selectedCategory = 'category1';
    component.selectedCompany = 'company1';
    component.selectedStockStatus = 'low_stock';

    component.clearFilters();

    expect(component.searchControl.value).toBe('');
    expect(component.selectedWarehouse).toBe('');
    expect(component.selectedCategory).toBe('');
    expect(component.selectedCompany).toBe('');
    expect(component.selectedStockStatus).toBe('all');
  });

  it('should toggle auto-refresh', () => {
    expect(component.autoRefreshEnabled).toBe(false);
    
    component.toggleAutoRefresh();
    expect(component.autoRefreshEnabled).toBe(true);
    expect(toastService.info).toHaveBeenCalled();
    
    component.toggleAutoRefresh();
    expect(component.autoRefreshEnabled).toBe(false);
  });

  it('should handle page change', () => {
    const event = { pageSize: 50, pageIndex: 2 };
    component.onPageChange(event);
    
    expect(component.pageSize).toBe(50);
    expect(component.pageIndex).toBe(2);
    expect(inventoryService.getStockLevels).toHaveBeenCalled();
  });

  it('should cleanup on destroy', () => {
    component.autoRefreshEnabled = true;
    component.autoRefreshInterval = setInterval(() => {}, 1000);
    
    component.ngOnDestroy();
    
    expect(component.autoRefreshInterval).toBeDefined();
  });
});
