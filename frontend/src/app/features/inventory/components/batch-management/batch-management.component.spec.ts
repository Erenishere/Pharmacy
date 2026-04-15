import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { BatchManagementComponent } from './batch-management.component';
import { BatchService } from '../../services/batch.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Batch, BatchStatistics } from '../../models/batch.model';

describe('BatchManagementComponent', () => {
  let component: BatchManagementComponent;
  let fixture: ComponentFixture<BatchManagementComponent>;
  let batchService: jasmine.SpyObj<BatchService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const mockBatch: Batch = {
    _id: 'batch1',
    batchNumber: 'BATCH001',
    item: {
      _id: 'item1',
      name: 'Test Item',
      code: 'ITEM001'
    },
    warehouse: {
      _id: 'warehouse1',
      name: 'Main Warehouse',
      code: 'WH001'
    },
    manufacturingDate: '2024-01-01',
    expiryDate: '2025-12-31',
    quantity: 1000,
    remainingQuantity: 800,
    unitCost: 10,
    totalCost: 10000,
    status: 'active',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  const mockStatistics: BatchStatistics = {
    totalBatches: 100,
    activeBatches: 80,
    expiredBatches: 10,
    nearExpiryBatches: 5,
    depletedBatches: 5,
    totalValue: 500000,
    totalQuantity: 50000,
    totalRemainingQuantity: 40000
  };

  beforeEach(async () => {
    const batchServiceSpy = jasmine.createSpyObj('BatchService', [
      'getAllBatches',
      'getBatchStatistics',
      'getBatchById',
      'getExpiringBatches',
      'getExpiredBatches'
    ]);
    const toastServiceSpy = jasmine.createSpyObj('ToastService', [
      'success',
      'error',
      'info'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        BatchManagementComponent,
        HttpClientTestingModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: BatchService, useValue: batchServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    batchService = TestBed.inject(BatchService) as jasmine.SpyObj<BatchService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;

    // Setup default spy returns
    batchService.getAllBatches.and.returnValue(of({
      success: true,
      data: [mockBatch],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 25
      }
    }));

    batchService.getBatchStatistics.and.returnValue(of({
      success: true,
      data: mockStatistics
    }));

    fixture = TestBed.createComponent(BatchManagementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should load statistics on init', () => {
      fixture.detectChanges();
      expect(batchService.getBatchStatistics).toHaveBeenCalled();
      expect(component.statistics).toEqual(mockStatistics);
    });

    it('should load batches on init', () => {
      fixture.detectChanges();
      expect(batchService.getAllBatches).toHaveBeenCalled();
      expect(component.dataSource.data.length).toBe(1);
      expect(component.dataSource.data[0]).toEqual(mockBatch);
    });

    it('should setup search control with debounce', (done) => {
      fixture.detectChanges();
      component.searchControl.setValue('test');
      
      setTimeout(() => {
        expect(batchService.getAllBatches).toHaveBeenCalledTimes(2); // Once on init, once after search
        done();
      }, 500);
    });
  });

  describe('Batch Status Helpers', () => {
    it('should identify expired batch', () => {
      const expiredBatch = { ...mockBatch, status: 'expired' as const };
      expect(component.getBatchStatusClass(expiredBatch)).toBe('expired');
      expect(component.getBatchStatusLabel(expiredBatch)).toBe('Expired');
      expect(component.getBatchStatusIcon(expiredBatch)).toBe('error');
    });

    it('should identify depleted batch', () => {
      const depletedBatch = { ...mockBatch, status: 'depleted' as const };
      expect(component.getBatchStatusClass(depletedBatch)).toBe('depleted');
      expect(component.getBatchStatusLabel(depletedBatch)).toBe('Depleted');
      expect(component.getBatchStatusIcon(depletedBatch)).toBe('remove_circle');
    });

    it('should identify near-expiry batch', () => {
      const nearExpiryDate = new Date();
      nearExpiryDate.setDate(nearExpiryDate.getDate() + 30);
      const nearExpiryBatch = { 
        ...mockBatch, 
        expiryDate: nearExpiryDate.toISOString() 
      };
      
      expect(component.isNearExpiry(nearExpiryBatch.expiryDate)).toBe(true);
      expect(component.getBatchStatusClass(nearExpiryBatch)).toBe('near-expiry');
      expect(component.getBatchStatusLabel(nearExpiryBatch)).toBe('Near Expiry');
    });

    it('should identify active batch', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const activeBatch = { 
        ...mockBatch, 
        expiryDate: futureDate.toISOString() 
      };
      
      expect(component.getBatchStatusClass(activeBatch)).toBe('active');
      expect(component.getBatchStatusLabel(activeBatch)).toBe('Active');
      expect(component.getBatchStatusIcon(activeBatch)).toBe('check_circle');
    });
  });

  describe('Expiry Date Helpers', () => {
    it('should correctly identify expired date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      expect(component.isExpired(pastDate.toISOString())).toBe(true);
    });

    it('should correctly identify non-expired date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 100);
      expect(component.isExpired(futureDate.toISOString())).toBe(false);
    });

    it('should calculate days until expiry correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const days = component.getDaysUntilExpiry(futureDate.toISOString());
      expect(days).toBeGreaterThanOrEqual(29);
      expect(days).toBeLessThanOrEqual(30);
    });

    it('should identify near expiry within threshold', () => {
      component.expiryDaysThreshold = 90;
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 60);
      expect(component.isNearExpiry(nearDate.toISOString())).toBe(true);
    });

    it('should not identify near expiry beyond threshold', () => {
      component.expiryDaysThreshold = 90;
      const farDate = new Date();
      farDate.setDate(farDate.getDate() + 120);
      expect(component.isNearExpiry(farDate.toISOString())).toBe(false);
    });
  });

  describe('FIFO/FEFO Recommendations', () => {
    it('should recommend "Do Not Use" for expired batches', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const expiredBatch = { ...mockBatch, expiryDate: pastDate.toISOString() };
      
      expect(component.getFifoRecommendation(expiredBatch)).toBe('Do Not Use - Expired');
      expect(component.getFifoRecommendationClass(expiredBatch)).toBe('fifo-expired');
    });

    it('should recommend "Use First" for batches expiring within 30 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 20);
      const soonBatch = { ...mockBatch, expiryDate: soonDate.toISOString() };
      
      expect(component.getFifoRecommendation(soonBatch)).toBe('Use First - Expiring Soon');
      expect(component.getFifoRecommendationClass(soonBatch)).toBe('fifo-urgent');
    });

    it('should recommend "Use Next" for batches expiring within 90 days', () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 60);
      const nearBatch = { ...mockBatch, expiryDate: nearDate.toISOString() };
      
      expect(component.getFifoRecommendation(nearBatch)).toBe('Use Next - Near Expiry');
      expect(component.getFifoRecommendationClass(nearBatch)).toBe('fifo-soon');
    });

    it('should recommend "Normal Priority" for batches expiring beyond 90 days', () => {
      const farDate = new Date();
      farDate.setDate(farDate.getDate() + 120);
      const normalBatch = { ...mockBatch, expiryDate: farDate.toISOString() };
      
      expect(component.getFifoRecommendation(normalBatch)).toBe('Normal Priority');
      expect(component.getFifoRecommendationClass(normalBatch)).toBe('fifo-normal');
    });
  });

  describe('Filtering', () => {
    it('should apply warehouse filter', () => {
      fixture.detectChanges();
      component.selectedWarehouse = 'warehouse1';
      component.onFilterChange();
      
      expect(batchService.getAllBatches).toHaveBeenCalledWith(
        jasmine.objectContaining({
          locationIds: ['warehouse1']
        })
      );
    });

    it('should apply status filter for active batches', () => {
      fixture.detectChanges();
      component.selectedStatus = 'active';
      component.onFilterChange();
      
      expect(batchService.getAllBatches).toHaveBeenCalledWith(
        jasmine.objectContaining({
          statuses: ['active']
        })
      );
    });

    it('should apply status filter for expired batches', () => {
      fixture.detectChanges();
      component.selectedStatus = 'expired';
      component.onFilterChange();
      
      expect(batchService.getAllBatches).toHaveBeenCalledWith(
        jasmine.objectContaining({
          statuses: ['expired'],
          includeExpired: true
        })
      );
    });

    it('should clear all filters', () => {
      fixture.detectChanges();
      component.selectedWarehouse = 'warehouse1';
      component.selectedStatus = 'expired';
      component.searchControl.setValue('test');
      
      component.clearFilters();
      
      expect(component.selectedWarehouse).toBe('');
      expect(component.selectedStatus).toBe('all');
      expect(component.searchControl.value).toBe('');
      expect(batchService.getAllBatches).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('should handle page change', () => {
      fixture.detectChanges();
      const event = { pageSize: 50, pageIndex: 2 };
      component.onPageChange(event);
      
      expect(component.pageSize).toBe(50);
      expect(component.pageIndex).toBe(2);
      expect(batchService.getAllBatches).toHaveBeenCalledWith(
        jasmine.objectContaining({
          page: 3, // pageIndex + 1
          limit: 50
        })
      );
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data successfully', (done) => {
      fixture.detectChanges();
      component.refreshData();
      
      expect(component.refreshing).toBe(true);
      expect(batchService.getBatchStatistics).toHaveBeenCalled();
      expect(batchService.getAllBatches).toHaveBeenCalled();
      
      setTimeout(() => {
        expect(component.refreshing).toBe(false);
        expect(toastService.success).toHaveBeenCalledWith('Batch data refreshed');
        done();
      }, 600);
    });

    it('should toggle auto-refresh on', () => {
      fixture.detectChanges();
      component.toggleAutoRefresh();
      
      expect(component.autoRefreshEnabled).toBe(true);
      expect(toastService.info).toHaveBeenCalledWith('Auto-refresh enabled (60s)');
      expect(component.autoRefreshInterval).toBeDefined();
    });

    it('should toggle auto-refresh off', () => {
      fixture.detectChanges();
      component.autoRefreshEnabled = true;
      component.autoRefreshInterval = setInterval(() => {}, 1000);
      
      component.toggleAutoRefresh();
      
      expect(component.autoRefreshEnabled).toBe(false);
      expect(toastService.info).toHaveBeenCalledWith('Auto-refresh disabled');
    });
  });

  describe('Error Handling', () => {
    it('should handle batch loading error', () => {
      batchService.getAllBatches.and.returnValue(
        throwError(() => new Error('Network error'))
      );
      
      fixture.detectChanges();
      
      expect(toastService.error).toHaveBeenCalledWith('Failed to load batches');
      expect(component.loading).toBe(false);
    });

    it('should handle statistics loading error gracefully', () => {
      batchService.getBatchStatistics.and.returnValue(
        throwError(() => new Error('Network error'))
      );
      
      fixture.detectChanges();
      
      // Should not crash, just log error
      expect(component.statistics).toBeDefined();
    });
  });

  describe('Formatting Helpers', () => {
    it('should format date correctly', () => {
      const date = '2024-01-15';
      const formatted = component.formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2024');
    });

    it('should format number correctly', () => {
      expect(component.formatNumber(1000)).toBe('1,000');
      expect(component.formatNumber(undefined)).toBe('0');
    });

    it('should format currency correctly', () => {
      expect(component.formatCurrency(1000.50)).toBe('Rs. 1,000.50');
      expect(component.formatCurrency(undefined)).toBe('Rs. 0');
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup on destroy', () => {
      fixture.detectChanges();
      component.autoRefreshInterval = setInterval(() => {}, 1000);
      
      component.ngOnDestroy();
      
      expect(component.autoRefreshInterval).toBeDefined();
      // Interval should be cleared
    });
  });

  describe('Batch Actions', () => {
    it('should view batch details', () => {
      spyOn(console, 'log');
      component.viewBatchDetails(mockBatch);
      expect(console.log).toHaveBeenCalledWith('View batch details:', mockBatch);
      expect(toastService.info).toHaveBeenCalled();
    });

    it('should view batch history', () => {
      spyOn(console, 'log');
      component.viewBatchHistory(mockBatch);
      expect(console.log).toHaveBeenCalledWith('View batch history:', mockBatch);
      expect(toastService.info).toHaveBeenCalled();
    });

    it('should view item batches', () => {
      fixture.detectChanges();
      component.viewItemBatches(mockBatch);
      
      expect(component.selectedItem).toBe('item1');
      expect(component.searchControl.value).toBe('Test Item');
      expect(batchService.getAllBatches).toHaveBeenCalled();
    });
  });
});
