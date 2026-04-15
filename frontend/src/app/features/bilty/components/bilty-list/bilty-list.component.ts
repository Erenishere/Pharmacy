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
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
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
  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const params = `page=${this.pageIndex + 1}&limit=${this.pageSize}`;
    this.http.get<any>(`${environment.apiUrl}/bilty-receipts?${params}`).subscribe({
      next: (res) => {
        this.loading = false;
        this.dataSource.data = res.data || [];
        this.totalItems = res.pagination?.total || res.data?.length || 0;
      },
      error: () => { this.loading = false; }
    });
  }

  openCreate(): void {
    const ref = this.dialog.open(BiltyFormDialogComponent, {
      width: '980px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      panelClass: 'bilty-dialog-panel',
      backdropClass: 'bilty-dialog-backdrop',
      data: { mode: 'create' }
    });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openEdit(row: any): void {
    const ref = this.dialog.open(BiltyFormDialogComponent, {
      width: '980px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      panelClass: 'bilty-dialog-panel',
      backdropClass: 'bilty-dialog-backdrop',
      data: { mode: 'edit', record: row }
    });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  onDelete(row: any): void {
    if (!confirm('Delete this bilty receipt?')) return;
    this.http.delete<any>(`${environment.apiUrl}/bilty-receipts/${row._id}`).subscribe({
      next: () => { this.snackBar.open('Deleted', 'Close', { duration: 2000 }); this.load(); },
      error: (e) => this.snackBar.open(e?.error?.error?.message || 'Failed', 'Close', { duration: 3000 })
    });
  }

  onPrint(row: any): void {
    window.print();
  }

  onPage(e: PageEvent): void { this.pageIndex = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  fmtDate(d: string): string { return d ? new Date(d).toLocaleDateString('en-PK') : '—'; }

  statusClass(s: string): string {
    return s === 'received' ? 'chip-received' : s === 'sent' ? 'chip-sent' : 'chip-pending';
  }
}
