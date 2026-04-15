import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-print-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="print-preview-dialog">
      <div class="dialog-header no-print">
        <h2 mat-dialog-title>{{ data.title }}</h2>
        <div class="actions">
          <button 
            mat-raised-button 
            color="primary" 
            (click)="print()"
            matTooltip="Print document">
            <mat-icon>print</mat-icon>
            Print
          </button>
          <button 
            mat-button 
            (click)="close()"
            matTooltip="Close preview">
            <mat-icon>close</mat-icon>
            Close
          </button>
        </div>
      </div>

      <mat-dialog-content class="preview-content">
        <div class="print-area" [innerHTML]="data.content"></div>
      </mat-dialog-content>
    </div>
  `,
  styles: [`
    .print-preview-dialog {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      background: white;
    }

    h2 {
      margin: 0;
      color: #5E5873;
      font-size: 20px;
      font-weight: 600;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .preview-content {
      flex: 1;
      overflow: auto;
      padding: 24px;
      background: #f8f7fa;
    }

    .print-area {
      background: white;
      padding: 40px;
      min-height: 100%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    /* Print styles */
    @media print {
      .no-print {
        display: none !important;
      }

      .print-preview-dialog {
        max-height: none;
      }

      .preview-content {
        padding: 0;
        background: white;
        overflow: visible;
      }

      .print-area {
        padding: 0;
        box-shadow: none;
      }
    }

    /* Responsive */
    @media (max-width: 600px) {
      .dialog-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
      }

      .actions {
        width: 100%;
        justify-content: flex-end;
      }

      .preview-content {
        padding: 16px;
      }

      .print-area {
        padding: 20px;
      }
    }
  `]
})
export class PrintPreviewDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<PrintPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { content: string; title: string }
  ) {}

  print(): void {
    window.print();
  }

  close(): void {
    this.dialogRef.close();
  }
}
