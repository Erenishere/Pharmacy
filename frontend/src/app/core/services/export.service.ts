import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Export data to CSV format
   */
  exportToCSV(data: any[], filename: string): Promise<void> {
    return this.runExport(async () => {
      const Papa = await this.loadPapaParse();
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      this.downloadFile(blob, `${filename}_${this.getTimestamp()}.csv`);
    });
  }

  /**
   * Export HTML table to CSV
   */
  exportTableToCSV(tableId: string, filename: string): Promise<void> {
    const table = document.getElementById(tableId);
    if (!table) {
      console.error(`Table with id '${tableId}' not found`);
      return Promise.resolve();
    }

    const rows = Array.from(table.querySelectorAll('tr'));
    const data = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => cell.textContent?.trim() || '');
    });

    if (data.length === 0) {
      console.error('No data found in table');
      return Promise.resolve();
    }

    const headers = data[0];
    const objects = data.slice(1).map(row =>
      Object.fromEntries(row.map((cell, i) => [headers[i], cell]))
    );

    return this.exportToCSV(objects, filename);
  }

  /**
   * Export data to PDF format
   */
  exportToPDF(
    data: any[],
    columns: string[],
    filename: string,
    title?: string,
    orientation: 'portrait' | 'landscape' = 'portrait'
  ): Promise<void> {
    return this.runExport(async () => {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF(orientation);

      if (title) {
        doc.setFontSize(16);
        doc.setTextColor(115, 103, 240);
        doc.text(title, 14, 15);
      }

      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, title ? 22 : 15);

      const tableData = data.map(row => columns.map(col => row[col] || ''));

      autoTable(doc, {
        head: [columns],
        body: tableData,
        startY: title ? 28 : 20,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [115, 103, 240],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 247, 250]
        }
      });

      doc.save(`${filename}_${this.getTimestamp()}.pdf`);
    });
  }

  /**
   * Export HTML table to PDF
   */
  exportTableToPDF(
    tableId: string,
    filename: string,
    title?: string,
    orientation: 'portrait' | 'landscape' = 'portrait'
  ): Promise<void> {
    const table = document.getElementById(tableId);
    if (!table) {
      console.error(`Table with id '${tableId}' not found`);
      return Promise.resolve();
    }

    return this.runExport(async () => {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF(orientation);

      if (title) {
        doc.setFontSize(16);
        doc.setTextColor(115, 103, 240);
        doc.text(title, 14, 15);
      }

      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, title ? 22 : 15);

      autoTable(doc, {
        html: `#${tableId}`,
        startY: title ? 28 : 20,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [115, 103, 240],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 247, 250]
        }
      });

      doc.save(`${filename}_${this.getTimestamp()}.pdf`);
    });
  }

  /**
   * Export data to Excel format
   */
  exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1'): Promise<void> {
    return this.runExport(async () => {
      const XLSX = await this.loadXlsx();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const maxWidth = 50;
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.min(
          Math.max(
            key.length,
            ...data.map(row => String(row[key] || '').length)
          ),
          maxWidth
        )
      }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `${filename}_${this.getTimestamp()}.xlsx`);
    });
  }

  /**
   * Export HTML table to Excel
   */
  exportTableToExcel(tableId: string, filename: string, sheetName: string = 'Sheet1'): Promise<void> {
    const table = document.getElementById(tableId);
    if (!table) {
      console.error(`Table with id '${tableId}' not found`);
      return Promise.resolve();
    }

    return this.runExport(async () => {
      const XLSX = await this.loadXlsx();
      const worksheet = XLSX.utils.table_to_sheet(table);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      XLSX.writeFile(workbook, `${filename}_${this.getTimestamp()}.xlsx`);
    });
  }

  /**
   * Export multiple sheets to Excel
   */
  exportMultiSheetExcel(sheets: { name: string; data: any[] }[], filename: string): Promise<void> {
    return this.runExport(async () => {
      const XLSX = await this.loadXlsx();
      const workbook = XLSX.utils.book_new();

      sheets.forEach(sheet => {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      });

      XLSX.writeFile(workbook, `${filename}_${this.getTimestamp()}.xlsx`);
    });
  }

  /**
   * Helper: Download file
   */
  private downloadFile(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Helper: Get timestamp for filename
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  private async loadPapaParse(): Promise<typeof import('papaparse')> {
    return import('papaparse');
  }

  private async loadXlsx(): Promise<typeof import('xlsx')> {
    return import('xlsx');
  }

  private async runExport(task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
}
