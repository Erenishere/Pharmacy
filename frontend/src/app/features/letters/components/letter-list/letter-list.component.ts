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
      const refNo = `EL-${letter._id ? letter._id.substring(letter._id.length - 6).toUpperCase() : 'NEW'}`;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${this.escapeHtml(letter.subject)}</title>
            <style>
              body {
                font-family: Georgia, 'Times New Roman', Times, serif;
                margin: 0;
                padding: 0;
                color: #1a1a24;
                line-height: 1.65;
                background-color: #f3f3f6;
              }
              .letter-shell {
                max-width: 800px;
                margin: 40px auto;
                padding: 1in;
                background: #ffffff;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                box-sizing: border-box;
              }
              .formal-letterhead {
                text-align: center;
                margin-bottom: 40px;
              }
              .company-name {
                font-family: 'Playfair Display', Georgia, serif;
                font-size: 28px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 2px;
                color: #111111;
                margin: 0 0 4px 0;
              }
              .company-subtitle {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 3px;
                color: #7367f0;
                font-weight: 600;
                margin: 0 0 10px 0;
              }
              .company-contact {
                font-size: 11px;
                color: #555566;
                font-family: Arial, sans-serif;
                margin: 0;
              }
              .letterhead-divider {
                margin-top: 18px;
                height: 2px;
                background: linear-gradient(to right, rgba(115, 103, 240, 0), rgba(115, 103, 240, 0.6), rgba(115, 103, 240, 0));
              }
              .letter-info-bar {
                display: flex;
                justify-content: space-between;
                border-bottom: 1px solid #eef0f3;
                padding-bottom: 12px;
                margin-bottom: 30px;
                font-size: 13px;
                font-family: Arial, sans-serif;
                color: #4a4a5a;
              }
              .letter-subject {
                font-size: 20px;
                font-weight: 700;
                margin: 0 0 35px 0;
                color: #111111;
                text-align: left;
                border-left: 4px solid #7367f0;
                padding-left: 14px;
                font-family: Georgia, 'Times New Roman', Times, serif;
              }
              .letter-content {
                font-size: 15px;
                white-space: normal;
                text-align: justify;
                margin-bottom: 60px;
                min-height: 280px;
              }
              .signature-section {
                display: flex;
                justify-content: space-between;
                margin-top: 60px;
                font-family: Arial, sans-serif;
              }
              .sig-block {
                text-align: center;
                width: 220px;
              }
              .sig-line {
                border-top: 1px dashed #a0a0b0;
                margin-bottom: 8px;
                padding-top: 8px;
                font-size: 13px;
                color: #333344;
              }
              .sig-title {
                font-size: 12px;
                font-weight: bold;
                color: #555566;
              }
              .sig-company {
                font-size: 11px;
                color: #777788;
              }
              .print-actions {
                margin-top: 30px;
                display: flex;
                gap: 12px;
                justify-content: center;
                font-family: Arial, sans-serif;
              }
              .print-actions button {
                border: none;
                border-radius: 6px;
                padding: 10px 22px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s ease;
              }
              .print-btn {
                background: #7367f0;
                color: #fff;
                box-shadow: 0 4px 12px rgba(115, 103, 240, 0.3);
              }
              .print-btn:hover {
                background: #5b50d6;
              }
              .close-btn {
                background: #ececf6;
                color: #383845;
              }
              .close-btn:hover {
                background: #dedee9;
              }
              @media print {
                @page {
                  margin: 1in;
                }
                body {
                  background: #ffffff;
                  margin: 0;
                }
                .letter-shell {
                  margin: 0;
                  padding: 0;
                  box-shadow: none;
                  max-width: 100%;
                }
                .print-actions {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="letter-shell">
              <div class="formal-letterhead">
                <div class="company-name">Erenishere Pharmacy & Co.</div>
                <div class="company-subtitle">Premium Pharmaceutical Distributors & Retailers</div>
                <div class="company-contact">12-B Mall Road, Lahore | Tel: +92-42-35550192 | Email: contact@erenishere.com</div>
                <div class="letterhead-divider"></div>
              </div>
              
              <div class="letter-info-bar">
                <div><strong>Ref:</strong> ${this.escapeHtml(refNo)}</div>
                <div><strong>Date:</strong> ${new Date(letter.date).toLocaleDateString()}</div>
                <div><strong>To:</strong> ${this.escapeHtml(accountName)}</div>
              </div>
              
              <h2 class="letter-subject">Subject: ${this.escapeHtml(letter.subject)}</h2>
              
              <div class="letter-content">${printableContent}</div>
              
              <div class="signature-section">
                <div class="sig-block">
                  <div class="sig-line">Prepared By</div>
                  <div class="sig-title">${this.escapeHtml(letter.status)}</div>
                  <div class="sig-company">Staff Officer</div>
                </div>
                <div class="sig-block">
                  <div class="sig-line">Authorized Signatory</div>
                  <div class="sig-title">Erenishere Pharmacy & Co.</div>
                  <div class="sig-company">Executive Management</div>
                </div>
              </div>
              
              <div class="print-actions">
                <button class="print-btn" onclick="window.print()">Print Document</button>
                <button class="close-btn" onclick="window.close()">Close Window</button>
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
