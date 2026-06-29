import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DataTableColumn, TableActionClickEvent } from '../../models/data-table.model';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent implements AfterViewInit {
  @Input() set data(value: any[]) {
    this.dataSource.data = value || [];
    this.rowCount = this.dataSource.data.length;
    this.cdr.markForCheck();
  }

  @Input() set columns(value: DataTableColumn[]) {
    this._columns = value || [];
    this.displayedColumnKeys = this._columns.map(col => col.key);
    this.cdr.markForCheck();
  }

  get columns(): DataTableColumn[] {
    return this._columns;
  }

  @Input() getRowClass: (row: any) => string = () => '';
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() pageIndex = 0;
  @Input() pageSizeOptions = [10, 25, 50, 100];
  @Input() showPaginator = true;
  @Input() loading = false;

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() actionClick = new EventEmitter<TableActionClickEvent>();

  dataSource = new MatTableDataSource<any>([]);
  displayedColumnKeys: string[] = [];
  rowCount = 0;

  private _columns: DataTableColumn[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.cdr.markForCheck();
  }

  getCellValue(col: DataTableColumn, row: any): any {
    return col.getValue ? col.getValue(row) : row[col.key];
  }

  getTextCellValue(col: DataTableColumn, row: any): any {
    const value = this.getCellValue(col, row);
    return value ?? '-';
  }

  getCellClass(col: DataTableColumn, row: any): string {
    return col.getCellClass ? col.getCellClass(row) : '';
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  onSortChange(sortState: Sort): void {
    this.sortChange.emit(sortState);
  }

  onActionClick(actionKey: string, row: any, event: Event): void {
    event.stopPropagation();
    this.actionClick.emit({ action: actionKey, row });
  }

  getStatusClass(value: any): string {
    if (value === undefined || value === null) return '';
    const v = String(value).toLowerCase();
    
    if (['active', 'instock', 'positive', 'success', 'available'].some(s => v.includes(s))) return 'status-active';
    if (['expired', 'depleted', 'negative', 'danger', 'outstock', 'red'].some(s => v.includes(s))) return 'status-expired';
    if (['warning', 'soon', 'pending', 'quarantined'].some(s => v.includes(s))) return 'status-warning';
    
    return 'status-primary'; // Default for things like Warehouse names
  }

  trackByRowId(index: number, row: any): string {
    return row._id || row.id || index.toString();
  }

  trackByColumnKey(index: number, col: DataTableColumn): string {
    return col.key || index.toString();
  }
}
