import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PrintPreviewDialogComponent } from '@shared/components/print-preview-dialog/print-preview-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class PrintPreviewService {

  constructor(private dialog: MatDialog) {}

  /**
   * Open print preview with HTML content
   */
  openPreview(content: string, title: string = 'Print Preview'): void {
    this.dialog.open(PrintPreviewDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      data: { content, title },
      panelClass: 'print-preview-dialog-container'
    });
  }

  /**
   * Open print preview from DOM element
   */
  openPreviewFromElement(elementId: string, title: string = 'Print Preview'): void {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id '${elementId}' not found`);
      return;
    }

    const content = element.innerHTML;
    this.openPreview(content, title);
  }

  /**
   * Open print preview with custom template
   */
  openPreviewWithTemplate(
    data: any,
    templateFn: (data: any) => string,
    title: string = 'Print Preview'
  ): void {
    const content = templateFn(data);
    this.openPreview(content, title);
  }

  /**
   * Direct print without preview
   */
  printElement(elementId: string): void {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id '${elementId}' not found`);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Failed to open print window');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #7367F0; 
              color: white; 
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
}
