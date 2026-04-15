import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { RoutePlanService } from '../../services/route-plan.service';

@Component({
  selector: 'app-route-plan-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>{{ mode === 'create' ? 'New Route Plan' : 'Edit Route Plan' }}</h2>
        <button mat-icon-button (click)="dialogRef.close()"><mat-icon>close</mat-icon></button>
      </div>

      <mat-dialog-content>
        <form [formGroup]="form">
          <div class="form-row two-col">
            <mat-form-field appearance="outline">
              <mat-label>Month (YYYY-MM)</mat-label>
              <input matInput formControlName="monthYear" placeholder="2026-02" [readonly]="mode === 'edit'">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Salesman</mat-label>
              <mat-select formControlName="salesmanId" [disabled]="mode === 'edit'">
                @for (s of salesmen; track s._id) {
                  <mat-option [value]="s._id">{{ s.username || s.fullName }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-row two-col">
            <mat-form-field appearance="outline">
              <mat-label>Dimension</mat-label>
              <mat-select formControlName="dimensionId">
                <mat-option value="">None</mat-option>
                @for (d of dimensions; track d._id) {
                  <mat-option [value]="d._id">{{ d.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <h4>Targets</h4>
          <div class="form-row three-col">
            <mat-form-field appearance="outline">
              <mat-label>Sales Target</mat-label>
              <input matInput type="number" formControlName="salesTarget">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Recovery Target</mat-label>
              <input matInput type="number" formControlName="recoveryTarget">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Visit Target</mat-label>
              <input matInput type="number" formControlName="visitTarget">
            </mat-form-field>
          </div>

          <h4>Weekly Schedule</h4>
          <div formArrayName="days">
            @for (day of daysArray.controls; track $index; let i = $index) {
              <div [formGroupName]="i" class="form-row two-col day-row">
                <mat-form-field appearance="outline">
                  <mat-label>Day</mat-label>
                  <mat-select formControlName="dayOfWeek">
                    @for (d of weekDays; track d) { <mat-option [value]="d">{{ d }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Area</mat-label>
                  <mat-select formControlName="areaId">
                    @for (a of areas; track a._id) { <mat-option [value]="a._id">{{ a.name }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <button mat-icon-button color="warn" (click)="removeDay(i)"><mat-icon>remove_circle</mat-icon></button>
              </div>
            }
          </div>
          <button mat-stroked-button type="button" (click)="addDay()"><mat-icon>add</mat-icon> Add Day</button>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="dialogRef.close()" [disabled]="loading">Cancel</button>
        <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="loading || form.invalid">
          @if (loading) { <mat-spinner diameter="20"></mat-spinner> }
          @else { <ng-container><mat-icon>{{ mode === 'create' ? 'add' : 'save' }}</mat-icon> {{ mode === 'create' ? 'Create' : 'Update' }}</ng-container> }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrl: './route-plan-form.component.scss'
})
export class RoutePlanFormComponent implements OnInit {
  form: FormGroup;
  loading = false;
  mode: 'create' | 'edit' = 'create';
  salesmen: any[] = [];
  dimensions: any[] = [];
  areas: any[] = [];
  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  get daysArray(): FormArray { return this.form.get('days') as FormArray; }

  constructor(
    private fb: FormBuilder,
    private routePlanService: RoutePlanService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<RoutePlanFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      monthYear: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
      salesmanId: ['', Validators.required],
      dimensionId: [''],
      salesTarget: [0],
      recoveryTarget: [0],
      visitTarget: [0],
      days: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.mode = this.data?.mode || 'create';
    this.salesmen = this.data?.salesmen || [];

    this.http.get<any>(`${environment.apiUrl}/dimensions`).subscribe({
      next: (res) => { if (res.success) this.dimensions = res.data; }
    });
    this.http.get<any>(`${environment.apiUrl}/areas`).subscribe({
      next: (res) => { if (res.success) this.areas = res.data; }
    });

    if (this.mode === 'edit' && this.data?.plan) {
      const p = this.data.plan;
      this.form.patchValue({
        monthYear: p.monthYear,
        salesmanId: p.salesmanId?._id || p.salesmanId,
        dimensionId: p.dimensionId?._id || p.dimensionId || '',
        salesTarget: p.salesTarget,
        recoveryTarget: p.recoveryTarget,
        visitTarget: p.visitTarget,
      });
      (p.days || []).forEach((d: any) => {
        this.daysArray.push(this.fb.group({
          dayOfWeek: [d.dayOfWeek, Validators.required],
          areaId: [d.areaId?._id || d.areaId, Validators.required],
        }));
      });
    }
  }

  addDay(): void {
    this.daysArray.push(this.fb.group({ dayOfWeek: ['Monday', Validators.required], areaId: ['', Validators.required] }));
  }

  removeDay(i: number): void { this.daysArray.removeAt(i); }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const request = this.mode === 'create'
      ? this.routePlanService.createRoutePlan(this.form.value)
      : this.routePlanService.updateRoutePlan(this.data.plan._id, this.form.value);

    request.subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) { this.snackBar.open('Route plan saved', 'Close', { duration: 3000 }); this.dialogRef.close(true); }
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error?.message || 'Failed to save', 'Close', { duration: 3000 });
      }
    });
  }
}
