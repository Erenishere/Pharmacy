import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'numeric' | 'currency' | 'date' | 'status' | 'action' | 'custom';
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  actions?: { icon: string; label: string; actionKey: string; color?: string; tooltip?: string; showIf?: (row: any) => boolean }[];
  colorMap?: Record<string, string>; // Maps status string to color (e.g., 'active' -> 'primary')
  classMap?: Record<string, string>; // Maps status string to CSS class
  pipeFormat?: string; // e.g. 'dd/MM/yyyy' for date
}

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
  styleUrl: './data-table.component.scss'
})
export class DataTableComponent implements AfterViewInit {
  @Input() set data(value: any[]) {
    this.dataSource.data = value || [];
  }
  @Input() columns: TableColumn[] = [];
  
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() pageIndex = 0;
  @Input() pageSizeOptions = [10, 25, 50, 100];
  @Input() showPaginator = true;
  @Input() loading = false;

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() actionClick = new EventEmitter<{ action: string; row: any }>();

  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  get displayedColumnKeys(): string[] {
    return this.columns.map(col => col.key);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  onPageChange(event: PageEvent) {
    this.pageChange.emit(event);
  }

  onSortChange(sortState: Sort) {
    this.sortChange.emit(sortState);
  }

  onActionClick(action: string, row: any, event: Event) {
    event.stopPropagation();
    this.actionClick.emit({ action, row });
  }

  trackByRowId(index: number, row: any): string {
    return row._id || row.id || index.toString();
  }
}
