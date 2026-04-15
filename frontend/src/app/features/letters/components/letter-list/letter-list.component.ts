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
import { LetterService } from '../../services/letter.service';
import { Letter } from '../../models/letter.model';
import { LetterFormDialogComponent } from '../letter-form-dialog/letter-form-dialog.component';

@Component({
  selector: 'app-letter-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatDialogModule, MatSnackBarModule, MatCardModule, MatChipsModule,
    MatProgressSpinnerModule, MatTooltipModule
  ],
  templateUrl: './letter-list.component.html',
  styleUrl: './letter-list.component.scss'
})
export class LetterListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['date', 'letterType', 'subject', 'account', 'status', 'actions'];
  dataSource = new MatTableDataSource<Letter>([]);
  loading = false;
  typeFilter = new FormControl('');
  statusFilter = new FormControl('');

  constructor(private letterService: LetterService, private dialog: MatDialog, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadLetters(); }

  loadLetters(): void {
    this.loading = true;
    const filters: any = {};
    if (this.typeFilter.value) filters.letterType = this.typeFilter.value;
    if (this.statusFilter.value) filters.status = this.statusFilter.value;

    this.letterService.getLetters(filters).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) { this.dataSource.data = res.data; this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }
      },
      error: () => { this.loading = false; }
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(LetterFormDialogComponent, { width: '700px', maxHeight: '90vh', data: { mode: 'create' } });
    ref.afterClosed().subscribe(r => { if (r) this.loadLetters(); });
  }

  openEditDialog(letter: Letter): void {
    const ref = this.dialog.open(LetterFormDialogComponent, { width: '700px', maxHeight: '90vh', data: { mode: 'edit', letter } });
    ref.afterClosed().subscribe(r => { if (r) this.loadLetters(); });
  }

  printLetter(letter: Letter): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>${letter.subject}</title></head><body>
        <h1>${letter.subject}</h1><p>Date: ${new Date(letter.date).toLocaleDateString()}</p>
        <p>Type: ${letter.letterType}</p><hr><div>${letter.content}</div></body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  }

  deleteLetter(letter: Letter): void {
    if (!confirm('Delete this letter?')) return;
    this.letterService.deleteLetter(letter._id).subscribe({
      next: () => { this.snackBar.open('Letter deleted', 'Close', { duration: 3000 }); this.loadLetters(); },
      error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 3000 })
    });
  }
}
