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
    <div class="route-plan-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <span class="title-content">
          <mat-icon>map</mat-icon>
          <span>{{ mode === 'create' ? 'New Route Plan' : 'Edit Route Plan' }}</span>
        </span>
        <button mat-icon-button type="button" class="close-btn" aria-label="Close route plan dialog" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="form" class="route-plan-form">
          <section class="form-section">
            <div class="section-heading">Plan Details</div>
            <div class="form-grid two-column">
              <mat-form-field appearance="outline">
                <mat-label>Month (YYYY-MM)</mat-label>
                <input matInput formControlName="monthYear" placeholder="2026-02" [readonly]="mode === 'edit'">
                <mat-error *ngIf="form.get('monthYear')?.hasError('required')">Month is required.</mat-error>
                <mat-error *ngIf="form.get('monthYear')?.hasError('pattern')">Use YYYY-MM format, for example 2026-05.</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Salesman</mat-label>
                <mat-select formControlName="salesmanId" [disabled]="mode === 'edit'">
                  @for (s of salesmen; track s._id) {
                    <mat-option [value]="s.routePlanUserId || s._id">{{ s.displayName || s.name || s.fullName || s.username }}</mat-option>
                  }
                </mat-select>
                <mat-error *ngIf="form.get('salesmanId')?.hasError('required')">Salesman is required.</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline" class="field-span-full">
                <mat-label>Dimension</mat-label>
                <mat-select formControlName="dimensionId">
                  <mat-option value="">None</mat-option>
                  @for (d of dimensions; track d._id) {
                    <mat-option [value]="d._id">{{ d.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            @if (mode === 'create' && salesmen.length === 0) {
              <div class="inline-warning">
                No linked salesman user is available for route plans yet. Create or link a salesman user first.
              </div>
            }
          </section>

          <section class="form-section">
            <div class="section-heading">Targets</div>
            <div class="form-grid three-column">
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
          </section>

          <section class="form-section">
            <div class="section-heading">Weekly Schedule</div>
            <div class="days-list" formArrayName="days">
              @if (daysArray.controls.length === 0) {
                <div class="empty-days">No visit day added yet. Use Add Day to build the schedule.</div>
              }
              @for (day of daysArray.controls; track $index; let i = $index) {
                <div [formGroupName]="i" class="day-row">
                  <div class="form-grid day-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Day</mat-label>
                      <mat-select formControlName="dayOfWeek">
                        @for (d of weekDays; track d) {
                          <mat-option [value]="d">{{ d }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Area</mat-label>
                      <mat-select formControlName="areaId">
                        @for (a of areas; track a._id) {
                          <mat-option [value]="a._id">{{ a.name }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>
                  <button mat-icon-button type="button" color="warn" class="remove-day-btn" aria-label="Remove day" (click)="removeDay(i)">
                    <mat-icon>remove_circle</mat-icon>
                  </button>
                </div>
              }
            </div>
            <button mat-stroked-button type="button" class="add-day-btn" (click)="addDay()">
              <mat-icon>add</mat-icon>
              Add Day
            </button>
          </section>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-stroked-button type="button" (click)="dialogRef.close()" [disabled]="loading">Cancel</button>
        <button mat-raised-button color="primary" type="button" (click)="onSubmit()" [disabled]="loading">
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.mode === 'create' && this.salesmen.length === 0) {
        this.snackBar.open('No linked salesman user is available for route plans.', 'Close', { duration: 3500 });
      } else {
        this.snackBar.open('Enter month in YYYY-MM format and select a salesman.', 'Close', { duration: 3500 });
      }
      return;
    }
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
