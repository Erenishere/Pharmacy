import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { BiltyService } from '../../services/bilty.service';

const NUG_TYPES = ['Single', 'Double', 'Triple', 'Bundle of 4', 'Single Kata', 'Double Kata'];
const NUG_MULTIPLIERS: Record<string, number> = {
  Single: 1,
  Double: 2,
  Triple: 3,
  'Bundle of 4': 4,
  'Single Kata': 6,
  'Double Kata': 12
};

@Component({
  selector: 'app-bilty-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="bf-dialog">
      <div class="bf-header">
        <div class="bf-title-wrap">
          <div class="bf-title">
            <mat-icon>local_shipping</mat-icon>
            {{ data?.mode === 'edit' ? 'Edit Bilty Receipt' : 'Create Bilty Receipt' }}
          </div>
          <p class="bf-subtitle">Capture bilty movement, account mapping and nug breakdown.</p>
        </div>

        <button
          type="button"
          class="bf-close"
          (click)="dialogRef.close()"
          aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form class="bf-body" [formGroup]="form">

        <div class="bf-card">
          <div class="bf-section-title">Bilty Basics</div>

          <div class="bf-grid cols-3">
            <div class="bf-field">
              <label class="bf-label required-label">Select Bilty</label>
              <select class="bf-select" formControlName="biltyType">
                <option value="receive">Bilty Receive</option>
                <option value="send">Bilty Send</option>
              </select>
            </div>

            <div class="bf-field">
              <label class="bf-label required-label">Date</label>
              <input class="bf-input" type="date" formControlName="biltyDate">
            </div>

            <div class="bf-field">
              <label class="bf-label">Bilty No</label>
              <input class="bf-input" type="text" formControlName="biltyNo" placeholder="Bilty number">
            </div>
          </div>
        </div>

        <div class="bf-card">
          <div class="bf-section-title">Account &amp; Transport</div>

          <div class="bf-grid cols-2">
            <div class="bf-field">
              <label class="bf-label required-label">Party Account Title</label>
              <select class="bf-select" formControlName="partyId">
                <option value="">-- Select Party --</option>
                @for (c of customers; track c._id) {
                  <option [value]="c._id">{{ c.name }}</option>
                }
              </select>
            </div>

            <div class="bf-field">
              <label class="bf-label">Claim Account</label>
              <select class="bf-select" formControlName="claimAccountId">
                <option value="">-- Select --</option>
                @for (ca of claimAccounts; track ca._id) {
                  <option [value]="ca._id">{{ ca.name }}</option>
                }
              </select>
            </div>
          </div>

          <div class="bf-grid cols-3">
            <div class="bf-field">
              <label class="bf-label">Transporter Name</label>
              <input class="bf-input" type="text" formControlName="transporterName" placeholder="Transporter">
            </div>

            <div class="bf-field">
              <label class="bf-label">Agent Name</label>
              <input class="bf-input" type="text" formControlName="agentName" placeholder="Agent name">
            </div>

            <div class="bf-field">
              <label class="bf-label">Agent Amount</label>
              <input class="bf-input" type="number" formControlName="agentAmount" min="0">
            </div>
          </div>

          <div class="bf-grid cols-3">
            <div class="bf-field">
              <label class="bf-label">Bilty Amount</label>
              <input class="bf-input" type="number" formControlName="biltyAmount" min="0">
            </div>

            <div class="bf-field">
              <label class="bf-label">Total Nug (auto)</label>
              <input class="bf-input" type="number" formControlName="totalNug" readonly>
            </div>
          </div>
        </div>

        <div class="bf-card">
          <div class="bf-section-title">Nug Detail</div>

          <div class="bf-nug-wrap">
            <table class="bf-nug-table" formArrayName="nugDetail">
              <thead>
                <tr>
                  <th>Nug Type</th>
                  <th class="num">Qty Nug</th>
                  <th class="num">Total Loose Nug</th>
                </tr>
              </thead>
              <tbody>
                @for (row of nugArray.controls; track $index; let i = $index) {
                  <tr [formGroupName]="i">
                    <td class="nug-type">
                      <div class="nug-type-wrap">
                        <span>{{ nugTypes[i] }}</span>
                        <small>x{{ nugMultipliers[nugTypes[i]] }}</small>
                      </div>
                    </td>
                    <td class="num">
                      <input class="bf-input sm" type="number" formControlName="qtyNug" min="0" (input)="calcLoose(i)">
                    </td>
                    <td class="num total-loose">{{ row.get('totalLooseNug')?.value || 0 }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="bf-total-label">Total Nug</td>
                  <td class="num total-loose">{{ form.get('totalNug')?.value || 0 }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </form>

      <div class="bf-actions">
        <div class="bf-total-pill">
          <span>Total Nug</span>
          <strong>{{ form.get('totalNug')?.value || 0 }}</strong>
        </div>

        <div class="bf-action-buttons">
          <button type="button" class="bf-btn-cancel" (click)="dialogRef.close()" [disabled]="loading">Cancel</button>
          <button type="button" class="bf-btn-save" (click)="onSubmit()" [disabled]="loading || form.invalid">
            @if (loading) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>save</mat-icon>
              Save
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './bilty-form-dialog.component.scss'
})
export class BiltyFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  customers: any[] = [];
  claimAccounts: any[] = [];
  nugTypes = NUG_TYPES;
  nugMultipliers = NUG_MULTIPLIERS;

  get nugArray(): FormArray { return this.form.get('nugDetail') as FormArray; }

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private biltyService: BiltyService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<BiltyFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      biltyType: ['receive', Validators.required],
      biltyDate: [new Date().toISOString().split('T')[0], Validators.required],
      biltyNo: [''],
      partyId: [''],
      claimAccountId: [''],
      transporterName: [''],
      agentName: [''],
      agentAmount: [0],
      biltyAmount: [0],
      totalNug: [{ value: 0, disabled: true }],
      nugDetail: this.fb.array(
        NUG_TYPES.map((t) => this.fb.group({ nugType: [t], qtyNug: [0], totalLooseNug: [0] }))
      )
    });
  }

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/customers?limit=500`).subscribe({
      next: (res) => { this.customers = res.data || []; }
    });

    this.http.get<any>(`${environment.apiUrl}/claim-accounts?limit=200`).subscribe({
      next: (res) => { this.claimAccounts = res.data || []; }
    });

    if (this.data?.mode === 'edit' && this.data?.record) {
      this.patchForm(this.data.record);
    }
  }

  patchForm(r: any): void {
    this.form.patchValue({
      biltyType: r.biltyType || 'receive',
      biltyDate: r.biltyDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      biltyNo: r.biltyNo || '',
      partyId: r.partyId?._id || r.partyId || '',
      claimAccountId: r.claimAccountId?._id || r.claimAccountId || '',
      transporterName: r.transporterName || '',
      agentName: r.agentName || '',
      agentAmount: r.agentAmount || 0,
      biltyAmount: r.biltyAmount || 0
    });

    if (r.nugDetail?.length) {
      r.nugDetail.forEach((nd: any, i: number) => {
        const ctrl = this.nugArray.at(i);
        if (ctrl) {
          ctrl.patchValue({
            qtyNug: nd.qtyNug || 0,
            totalLooseNug: nd.totalLooseNug || 0
          });
        }
      });
    }

    this.updateTotal();
  }

  calcLoose(i: number): void {
    const row = this.nugArray.at(i);
    const qty = row.get('qtyNug')?.value || 0;
    const total = qty * (NUG_MULTIPLIERS[this.nugTypes[i]] || 1);
    row.get('totalLooseNug')?.setValue(total, { emitEvent: false });
    this.updateTotal();
  }

  updateTotal(): void {
    const total = this.nugArray.controls.reduce((sum, r) => sum + (r.get('totalLooseNug')?.value || 0), 0);
    this.form.get('totalNug')?.setValue(total, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = { ...this.form.getRawValue() };
    const req$ = this.data?.mode === 'edit'
      ? this.biltyService.updateReceipt(this.data.record._id, payload)
      : this.biltyService.createReceipt(payload);

    req$.subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Bilty saved', 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.loading = false;
        this.snackBar.open(e?.error?.error?.message || 'Failed to save', 'Close', { duration: 3000 });
      }
    });
  }
}
