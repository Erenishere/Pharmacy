import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../../core/services/auth.service';
import { LetterService } from '../../services/letter.service';
import { Letter } from '../../models/letter.model';
import { LetterFormDialogComponent } from '../letter-form-dialog/letter-form-dialog.component';
import { DataTableColumn, TableActionClickEvent } from '../../../../shared/models/data-table.model';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';


@Component({
  selector: 'app-letter-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatChipsModule, MatDialogModule, MatSnackBarModule, MatCardModule,
    MatProgressSpinnerModule, MatTooltipModule,
    DataTableComponent
  ],
  templateUrl: './letter-list.component.html',
  styleUrl: './letter-list.component.scss'
})
export class LetterListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = false;
  typeFilter = new FormControl('');
  statusFilter = new FormControl('');
  letters: Letter[] = [];
  private readonly currentUserRole: string;

  tableColumns: DataTableColumn[] = [
    { key: 'date', label: 'Date', getValue: (row: any) => new Date(row.date).toLocaleDateString(), sortable: true },
    { key: 'letterType', label: 'Type', getValue: (row: any) => this.formatLetterType(row.letterType) },
    { key: 'subject', label: 'Subject', getCellClass: (row: any) => 'subject-cell' },
    { key: 'account', label: 'Account', getValue: (row: any) => row.accountId?.name || 'N/A' },
    { key: 'status', label: 'Status', getCellClass: (row: any) => `status-badge ${row.status?.toLowerCase()}` },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'visibility', label: 'Print Letter', actionKey: 'print' },
      { icon: 'edit', label: 'Edit', actionKey: 'edit' },
      { icon: 'delete', label: 'Delete', actionKey: 'delete', color: 'warn', showIf: () => this.canDeleteLetters() }
    ]}
  ];

  constructor(
    private letterService: LetterService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.currentUserRole = this.authService.currentUserValue?.role?.toLowerCase?.() || '';
  }

  ngOnInit(): void { this.loadLetters(); }

  loadLetters(): void {
    this.loading = true;
    const filters: any = {};
    if (this.typeFilter.value) filters.letterType = this.typeFilter.value;
    if (this.statusFilter.value) filters.status = this.statusFilter.value;

    this.letterService.getLetters(filters).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) { this.letters = res.data; }
      },
      error: () => { this.loading = false; }
    });
  }

  onTableAction(event: TableActionClickEvent): void {
    const row = event.row as Letter;
    switch(event.action) {
      case 'print': this.printLetter(row); break;
      case 'edit': this.openEditDialog(row); break;
      case 'delete': this.deleteLetter(row); break;
    }
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(LetterFormDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      panelClass: 'standard-form-dialog-panel',
      data: { mode: 'create' }
    });
    ref.afterClosed().subscribe(r => { if (r) this.loadLetters(); });
  }

  openEditDialog(letter: Letter): void {
    const ref = this.dialog.open(LetterFormDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      panelClass: 'standard-form-dialog-panel',
      data: { mode: 'edit', letter }
    });
    ref.afterClosed().subscribe(r => { if (r) this.loadLetters(); });
  }

  printLetter(letter: Letter): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const accountName = letter.accountId?.name || 'General';
      const printableContent = this.escapeHtml(letter.content).replace(/\n/g, '<br>');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${this.escapeHtml(letter.subject)}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 32px;
                color: #2f2f37;
                line-height: 1.6;
              }
              .letter-shell {
                max-width: 840px;
                margin: 0 auto;
              }
              .letter-header {
                border-bottom: 2px solid #7367f0;
                padding-bottom: 16px;
                margin-bottom: 24px;
              }
              .letter-title {
                font-size: 28px;
                margin: 0 0 8px;
                color: #5b50d6;
              }
              .letter-meta {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px 20px;
                font-size: 14px;
              }
              .meta-label {
                font-weight: 700;
              }
              .letter-content {
                font-size: 15px;
                white-space: normal;
              }
              .print-actions {
                margin-top: 24px;
                display: flex;
                gap: 12px;
              }
              .print-actions button {
                border: none;
                border-radius: 6px;
                padding: 10px 16px;
                cursor: pointer;
                font-size: 14px;
              }
              .print-btn {
                background: #7367f0;
                color: #fff;
              }
              .close-btn {
                background: #ececf6;
                color: #383845;
              }
              @media print {
                .print-actions {
                  display: none;
                }
                body {
                  margin: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="letter-shell">
              <div class="letter-header">
                <h1 class="letter-title">${this.escapeHtml(letter.subject)}</h1>
                <div class="letter-meta">
                  <div><span class="meta-label">Date:</span> ${new Date(letter.date).toLocaleDateString()}</div>
                  <div><span class="meta-label">Type:</span> ${this.escapeHtml(this.formatLetterType(letter.letterType))}</div>
                  <div><span class="meta-label">Status:</span> ${this.escapeHtml(letter.status)}</div>
                  <div><span class="meta-label">Account:</span> ${this.escapeHtml(accountName)}</div>
                </div>
              </div>
              <div class="letter-content">${printableContent}</div>
              <div class="print-actions">
                <button class="print-btn" onclick="window.print()">Print</button>
                <button class="close-btn" onclick="window.close()">Close</button>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  deleteLetter(letter: Letter): void {
    if (!confirm('Delete this letter?')) return;
    this.letterService.deleteLetter(letter._id).subscribe({
      next: () => { this.snackBar.open('Letter deleted', 'Close', { duration: 3000 }); this.loadLetters(); },
      error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 3000 })
    });
  }

  private canDeleteLetters(): boolean {
    return this.currentUserRole === 'admin' || this.currentUserRole === 'manager';
  }

  private formatLetterType(letterType?: string): string {
    if (!letterType) {
      return 'N/A';
    }

    return letterType
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .trim();
  }

  private escapeHtml(value?: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
