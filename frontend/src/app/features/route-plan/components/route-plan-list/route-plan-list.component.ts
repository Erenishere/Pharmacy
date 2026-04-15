import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { RoutePlanService } from '../../services/route-plan.service';
import { RoutePlan } from '../../models/route-plan.model';
import { RoutePlanFormComponent } from '../route-plan-form/route-plan-form.component';

import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-route-plan-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule,
    MatSnackBarModule, MatCardModule, MatProgressSpinnerModule, MatTooltipModule,
    MatMenuModule, MatChipsModule
  ],
  templateUrl: './route-plan-list.component.html',
  styleUrl: './route-plan-list.component.scss'
})
export class RoutePlanListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns = ['monthYear', 'salesman', 'dimension', 'salesTarget', 'recoveryTarget', 'visitTarget', 'actions'];
  dataSource = new MatTableDataSource<RoutePlan>([]);
  loading = false;
  salesmen: any[] = [];

  monthFilter = new FormControl('');
  salesmanFilter = new FormControl('');

  constructor(
    private routePlanService: RoutePlanService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/salesmen`).subscribe({
      next: (res) => { if (res.success) this.salesmen = res.data; }
    });
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading = true;
    const filters: any = {};
    if (this.monthFilter.value) filters.monthYear = this.monthFilter.value;
    if (this.salesmanFilter.value) filters.salesmanId = this.salesmanFilter.value;

    this.routePlanService.getRoutePlans(filters).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) { this.dataSource.data = res.data; this.dataSource.paginator = this.paginator; }
      },
      error: () => { this.loading = false; }
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(RoutePlanFormComponent, { width: '700px', maxHeight: '90vh', data: { mode: 'create', salesmen: this.salesmen } });
    ref.afterClosed().subscribe(r => { if (r) this.loadPlans(); });
  }

  openEditDialog(plan: RoutePlan): void {
    const ref = this.dialog.open(RoutePlanFormComponent, { width: '700px', maxHeight: '90vh', data: { mode: 'edit', plan, salesmen: this.salesmen } });
    ref.afterClosed().subscribe(r => { if (r) this.loadPlans(); });
  }

  deletePlan(plan: RoutePlan): void {
    if (!confirm('Delete this route plan?')) return;
    this.routePlanService.deleteRoutePlan(plan._id).subscribe({
      next: () => { this.snackBar.open('Route plan deleted', 'Close', { duration: 3000 }); this.loadPlans(); },
      error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 3000 })
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(value || 0);
  }
}
