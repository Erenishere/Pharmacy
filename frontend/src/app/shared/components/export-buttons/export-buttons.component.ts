import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExportService } from '@core/services/export.service';

@Component({
  selector: 'app-export-buttons',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="export-buttons">
      <button 
        mat-stroked-button 
        (click)="exportCSV()"
        matTooltip="Export to CSV"
        class="export-btn">
        <mat-icon>download</mat-icon>
        CSV
      </button>
      <button 
        mat-stroked-button 
        (click)="exportPDF()"
        matTooltip="Export to PDF"
        class="export-btn">
        <mat-icon>picture_as_pdf</mat-icon>
        PDF
      </button>
      <button 
        mat-stroked-button 
        (click)="exportExcel()"
        matTooltip="Export to Excel"
        class="export-btn">
        <mat-icon>table_chart</mat-icon>
        Excel
      </button>
    </div>
  `,
  styles: [`
    .export-buttons {
      display: flex;
      gap: 8px;
      margin: 16px 0;
      flex-wrap: wrap;
    }

    .export-btn {
      min-width: 100px;
      color: #7367F0;
      border-color: #7367F0;
    }

    .export-btn:hover {
      background-color: rgba(115, 103, 240, 0.04);
    }

    .export-btn mat-icon {
      margin-right: 4px;
    }

    @media (max-width: 600px) {
      .export-buttons {
        flex-direction: column;
      }

      .export-btn {
        width: 100%;
      }
    }
  `]
})
export class ExportButtonsComponent {
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  @Input() filename: string = 'export';
  @Input() title?: string;
  @Input() tableId?: string;
  @Input() orientation: 'portrait' | 'landscape' = 'portrait';

  constructor(private exportService: ExportService) {}

  exportCSV(): void {
    if (this.tableId) {
      this.exportService.exportTableToCSV(this.tableId, this.filename);
    } else if (this.data.length > 0) {
      this.exportService.exportToCSV(this.data, this.filename);
    } else {
      console.warn('No data or tableId provided for export');
    }
  }

  exportPDF(): void {
    if (this.tableId) {
      this.exportService.exportTableToPDF(
        this.tableId, 
        this.filename, 
        this.title,
        this.orientation
      );
    } else if (this.data.length > 0 && this.columns.length > 0) {
      this.exportService.exportToPDF(
        this.data, 
        this.columns, 
        this.filename, 
        this.title,
        this.orientation
      );
    } else {
      console.warn('No data/columns or tableId provided for export');
    }
  }

  exportExcel(): void {
    if (this.tableId) {
      this.exportService.exportTableToExcel(this.tableId, this.filename);
    } else if (this.data.length > 0) {
      this.exportService.exportToExcel(this.data, this.filename);
    } else {
      console.warn('No data or tableId provided for export');
    }
  }
}
