import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../../core/services/auth.service';
import { BiltyReceipt, BiltyReceiptStatus } from '../../models/bilty.model';
import { BiltyService } from '../../services/bilty.service';
import { BiltyFormDialogComponent } from '../bilty-form-dialog/bilty-form-dialog.component';

@Component({
  selector: 'app-bilty-list',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatMenuModule,
  ],
  templateUrl: './bilty-list.component.html',
  styleUrl: './bilty-list.component.scss'
})
export class BiltyListComponent implements OnInit {
  displayedColumns = [
    'sno', 'partyName', 'claimAccount', 'town', 'transporterName',
    'biltyNo', 'totalNug', 'agentName', 'agentAmount', 'biltyAmount',
    'biltyDate', 'status', 'biltyType', 'actions'
  ];
  dataSource = new MatTableDataSource<BiltyReceipt>([]);
  loading = false;
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;
  private readonly currentUserRole: string;

  constructor(
    private biltyService: BiltyService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.currentUserRole = this.authService.currentUserValue?.role?.toLowerCase?.() || '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.biltyService.getReceipts({ page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
      next: (res) => {
        this.loading = false;
        this.dataSource.data = res.data || [];
        this.totalItems = res.pagination?.total || res.data?.length || 0;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openCreate(): void {
    const ref = this.dialog.open(BiltyFormDialogComponent, {
      width: '980px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      panelClass: ['standard-form-dialog-panel', 'bilty-dialog-panel'],
      backdropClass: 'bilty-dialog-backdrop',
      data: { mode: 'create' }
    });
    ref.afterClosed().subscribe((r) => {
      if (r) {
        this.load();
      }
    });
  }

  openEdit(row: BiltyReceipt): void {
    const ref = this.dialog.open(BiltyFormDialogComponent, {
      width: '980px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      panelClass: ['standard-form-dialog-panel', 'bilty-dialog-panel'],
      backdropClass: 'bilty-dialog-backdrop',
      data: { mode: 'edit', record: row }
    });
    ref.afterClosed().subscribe((r) => {
      if (r) {
        this.load();
      }
    });
  }

  onDelete(row: BiltyReceipt): void {
    if (!confirm('Delete this bilty receipt?')) {
      return;
    }

    this.biltyService.deleteReceipt(row._id).subscribe({
      next: () => {
        this.snackBar.open('Deleted', 'Close', { duration: 2000 });
        this.load();
      },
      error: (e) => this.snackBar.open(e?.error?.error?.message || 'Failed', 'Close', { duration: 3000 })
    });
  }

  onStatusTransition(row: BiltyReceipt): void {
    const nextStatus = this.getNextStatus(row);
    if (!nextStatus) {
      return;
    }

    const actionLabel = nextStatus === 'received' ? 'mark this bilty as received' : 'mark this bilty as sent';
    if (!confirm(`Confirm ${actionLabel}?`)) {
      return;
    }

    this.biltyService.updateReceiptStatus(row._id, nextStatus).subscribe({
      next: () => {
        const message = nextStatus === 'received' ? 'Bilty marked as received' : 'Bilty marked as sent';
        this.snackBar.open(message, 'Close', { duration: 2500, panelClass: 'snack-success' });
        this.load();
      },
      error: (e) => this.snackBar.open(e?.error?.error?.message || 'Failed to update status', 'Close', { duration: 3000 })
    });
  }

  onPrint(row: BiltyReceipt): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

    const nugRows = (row.nugDetail || [])
      .filter((item) => (item.qtyNug || 0) > 0)
      .map((item) => `
        <tr>
          <td>${this.escapeHtml(item.nugType)}</td>
          <td style="text-align:right;">${item.qtyNug || 0}</td>
          <td style="text-align:right;">${item.totalLooseNug || 0}</td>
        </tr>
      `)
      .join('');

    const partyName = this.escapeHtml(this.getPartyName(row));
    const claimAccount = this.escapeHtml(this.getClaimAccountName(row));
    const transporter = this.escapeHtml(row.transporterName || '-');
    const agentName = this.escapeHtml(row.agentName || '-');
    const biltyNo = this.escapeHtml(row.biltyNo || '-');
    const town = this.escapeHtml(this.getTown(row));
    const typeLabel = this.escapeHtml(this.getTypeLabel(row));
    const statusLabel = this.escapeHtml((row.status || 'pending').toUpperCase());

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${biltyNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #2f2f37; }
            .sheet { max-width: 920px; margin: 0 auto; }
            .header { border-bottom: 2px solid #7367f0; padding-bottom: 16px; margin-bottom: 22px; }
            .header h1 { margin: 0 0 8px; color: #5b50d6; font-size: 28px; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; font-size: 14px; }
            .meta strong { color: #383845; }
            .summary { margin: 18px 0 22px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
            .card { border: 1px solid #e3e0f4; border-radius: 10px; padding: 12px 14px; background: #faf9ff; }
            .card-label { font-size: 11px; text-transform: uppercase; color: #6e6b7b; font-weight: 700; }
            .card-value { display: block; margin-top: 6px; font-size: 18px; font-weight: 700; color: #383845; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd7fb; padding: 10px 12px; font-size: 13px; }
            th { background: #f3f1ff; text-align: left; }
            .actions { margin-top: 22px; display: flex; gap: 12px; }
            button { border: none; border-radius: 6px; padding: 10px 16px; cursor: pointer; font-size: 14px; }
            .print-btn { background: #7367f0; color: #fff; }
            .close-btn { background: #ececf6; color: #383845; }
            @media print {
              .actions { display: none; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <h1>Bilty Receipt</h1>
              <div class="meta">
                <div><strong>Bilty No:</strong> ${biltyNo}</div>
                <div><strong>Date:</strong> ${this.fmtDate(row.biltyDate)}</div>
                <div><strong>Type:</strong> ${typeLabel}</div>
                <div><strong>Status:</strong> ${statusLabel}</div>
                <div><strong>Party:</strong> ${partyName}</div>
                <div><strong>Town:</strong> ${town}</div>
                <div><strong>Claim Account:</strong> ${claimAccount}</div>
                <div><strong>Transporter:</strong> ${transporter}</div>
                <div><strong>Agent:</strong> ${agentName}</div>
              </div>
            </div>

            <div class="summary">
              <div class="card"><span class="card-label">Total Nug</span><span class="card-value">${row.totalNug || 0}</span></div>
              <div class="card"><span class="card-label">Agent Amount</span><span class="card-value">Rs. ${this.formatCurrency(row.agentAmount || 0)}</span></div>
              <div class="card"><span class="card-label">Bilty Amount</span><span class="card-value">Rs. ${this.formatCurrency(row.biltyAmount || 0)}</span></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Nug Type</th>
                  <th style="text-align:right;">Qty Nug</th>
                  <th style="text-align:right;">Total Loose Nug</th>
                </tr>
              </thead>
              <tbody>
                ${nugRows || '<tr><td colspan="3">No nug breakdown recorded.</td></tr>'}
              </tbody>
            </table>

            <div class="actions">
              <button class="print-btn" onclick="window.print()">Print</button>
              <button class="close-btn" onclick="window.close()">Close</button>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }

  fmtDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en-PK') : '-';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
  }

  get summary() {
    return {
      totalBiltys: this.totalItems,
      pendingBiltys: this.dataSource.data.filter((r) => r.status === 'pending').length,
      receivedBiltys: this.dataSource.data.filter((r) => r.status === 'received').length,
      sentBiltys: this.dataSource.data.filter((r) => r.status === 'sent').length,
      totalAmount: this.dataSource.data.reduce((sum, row) => sum + (row.biltyAmount || 0), 0)
    };
  }

  canDelete(row: BiltyReceipt): boolean {
    void row;
    return this.currentUserRole === 'admin' || this.currentUserRole === 'accountant';
  }

  getNextStatus(row: BiltyReceipt): BiltyReceiptStatus | null {
    if (row.biltyType === 'receive' && row.status !== 'received') {
      return 'received';
    }
    if (row.biltyType === 'send' && row.status !== 'sent') {
      return 'sent';
    }
    return null;
  }

  getTransitionLabel(row: BiltyReceipt): string {
    const nextStatus = this.getNextStatus(row);
    if (!nextStatus) {
      return '';
    }
    return nextStatus === 'received' ? 'Mark Received' : 'Mark Sent';
  }

  private getPartyName(row: BiltyReceipt): string {
    if (row.partyId && typeof row.partyId === 'object') {
      return row.partyId.name || row.partyName || '-';
    }
    return row.partyName || '-';
  }

  private getTown(row: BiltyReceipt): string {
    if (row.partyId && typeof row.partyId === 'object') {
      return row.partyId.town || row.partyTown || '-';
    }
    return row.partyTown || '-';
  }

  private getClaimAccountName(row: BiltyReceipt): string {
    if (row.claimAccountId && typeof row.claimAccountId === 'object') {
      return row.claimAccountId.name || row.claimAccountName || '-';
    }
    return row.claimAccountName || '-';
  }

  private getTypeLabel(row: BiltyReceipt): string {
    return row.biltyType === 'receive' ? 'Bilty Receive' : 'Bilty Send';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
