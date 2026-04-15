import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../../../shared/services/toast.service';
import { SupportingMasterService } from '../../services/supporting-master.service';

interface Salesman {
    _id?: string;
    code?: string;
    fullName: string;
    fatherName: string;
    cnic: string;
    dateOfBirth: Date;
    gender: 'male' | 'female';
    maritalStatus?: string;
    mobile: string;
    alternateMobile?: string;
    email?: string;
    permanentAddress: string;
    city: string;
    townId?: string;
    postalCode?: string;
    designation: string;
    department: string;
    joiningDate: Date;
    employmentType?: string;
    territory?: string;
    reportingManager?: string;
    basicSalary?: number;
    houseRent?: number;
    conveyance?: number;
    medicalAllowance?: number;
    commissionPercentage?: number;
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    branchName?: string;
    iban?: string;
    emergencyContactName?: string;
    emergencyRelationship?: string;
    emergencyPhone?: string;
    photo?: string;
    isActive: boolean;
    fieldAccess?: boolean;
    allowLogin?: boolean;
}

@Component({
    selector: 'app-salesman-registration-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatRadioModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule
    ],
    template: `
        <div class="salesman-dialog">
            <!-- Header -->
            <div class="dialog-header">
                <div class="header-content">
                    <div class="header-left">
                        <div class="header-icon">👨‍💼</div>
                        <div>
                            <h1 class="dialog-title">{{ isEditMode ? 'Edit' : 'Register' }} Salesman</h1>
                            <p class="dialog-subtitle">{{ isEditMode ? 'Update employee information' : 'Complete biographical and professional information' }}</p>
                        </div>
                    </div>
                    <button mat-icon-button class="close-btn" (click)="onCancel()">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="dialog-body" [formGroup]="salesmanForm">
                <!-- Personal Information -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">👤</div>
                        <h2 class="section-title">Personal Information</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label">Full Name <span class="required">*</span></label>
                            <input type="text" class="field-input" formControlName="fullName" placeholder="Enter full name">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Father's Name <span class="required">*</span></label>
                            <input type="text" class="field-input" formControlName="fatherName" placeholder="Enter father's name">
                        </div>
                        <div class="form-field">
                            <label class="field-label">CNIC <span class="required">*</span></label>
                            <input type="text" class="field-input" formControlName="cnic" placeholder="XXXXX-XXXXXXX-X" maxlength="15">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Date of Birth <span class="required">*</span></label>
                            <input type="date" class="field-input" formControlName="dateOfBirth">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Gender <span class="required">*</span></label>
                            <mat-radio-group formControlName="gender" class="radio-group">
                                <mat-radio-button value="male">Male</mat-radio-button>
                                <mat-radio-button value="female">Female</mat-radio-button>
                            </mat-radio-group>
                        </div>
                        <div class="form-field">
                            <label class="field-label">Marital Status</label>
                            <select class="field-input" formControlName="maritalStatus">
                                <option value="">Select status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Contact Information -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">📞</div>
                        <h2 class="section-title">Contact Information</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label">Mobile Number <span class="required">*</span></label>
                            <input type="tel" class="field-input" formControlName="mobile" placeholder="03XX-XXXXXXX">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Alternate Number</label>
                            <input type="tel" class="field-input" formControlName="alternateMobile" placeholder="03XX-XXXXXXX">
                        </div>
                        <div class="form-field full-width">
                            <label class="field-label">Email Address</label>
                            <input type="email" class="field-input" formControlName="email" placeholder="name@example.com">
                        </div>
                        <div class="form-field full-width">
                            <label class="field-label">Permanent Address <span class="required">*</span></label>
                            <textarea class="field-textarea" formControlName="permanentAddress" placeholder="Enter complete permanent address"></textarea>
                        </div>
                        <div class="form-field">
                            <label class="field-label">City <span class="required">*</span></label>
                            <input type="text" class="field-input" formControlName="city" placeholder="Enter city">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Town/Area</label>
                            <select class="field-input" formControlName="townId">
                                <option value="">Select town</option>
                                <option *ngFor="let town of towns" [value]="town._id">{{ town.name }}</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="field-label">Postal Code</label>
                            <input type="text" class="field-input" formControlName="postalCode" placeholder="Enter postal code">
                        </div>
                    </div>
                </div>

                <!-- Employment Details -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">💼</div>
                        <h2 class="section-title">Employment Details</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label">Designation <span class="required">*</span></label>
                            <select class="field-input" formControlName="designation">
                                <option value="">Select designation</option>
                                <option *ngFor="let des of designations" [value]="des._id">{{ des.name }}</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="field-label">Department <span class="required">*</span></label>
                            <select class="field-input" formControlName="department">
                                <option value="">Select department</option>
                                <option value="Sales">Sales</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Distribution">Distribution</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="field-label">Joining Date <span class="required">*</span></label>
                            <input type="date" class="field-input" formControlName="joiningDate">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Employment Type</label>
                            <select class="field-input" formControlName="employmentType">
                                <option value="">Select type</option>
                                <option value="Permanent">Permanent</option>
                                <option value="Contract">Contract</option>
                                <option value="Probation">Probation</option>
                                <option value="Part-time">Part-time</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="field-label">Territory/Beat</label>
                            <select class="field-input" formControlName="territory">
                                <option value="">Select territory</option>
                                <option value="North Zone">North Zone</option>
                                <option value="South Zone">South Zone</option>
                                <option value="East Zone">East Zone</option>
                                <option value="West Zone">West Zone</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Salary & Benefits -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">💰</div>
                        <h2 class="section-title">Salary & Benefits</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label">Basic Salary</label>
                            <input type="number" class="field-input" formControlName="basicSalary" placeholder="0.00">
                        </div>
                        <div class="form-field">
                            <label class="field-label">House Rent</label>
                            <input type="number" class="field-input" formControlName="houseRent" placeholder="0.00">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Conveyance</label>
                            <input type="number" class="field-input" formControlName="conveyance" placeholder="0.00">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Medical Allowance</label>
                            <input type="number" class="field-input" formControlName="medicalAllowance" placeholder="0.00">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Commission %</label>
                            <input type="number" class="field-input" formControlName="commissionPercentage" placeholder="0.00" step="0.01">
                        </div>
                    </div>
                </div>

                <!-- Bank Details -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">🏦</div>
                        <h2 class="section-title">Bank Account Details</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label">Bank Name</label>
                            <input type="text" class="field-input" formControlName="bankName" placeholder="Enter bank name">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Account Title</label>
                            <input type="text" class="field-input" formControlName="accountTitle" placeholder="Enter account title">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Account Number</label>
                            <input type="text" class="field-input" formControlName="accountNumber" placeholder="Enter account number">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Branch Name</label>
                            <input type="text" class="field-input" formControlName="branchName" placeholder="Enter branch name">
                        </div>
                        <div class="form-field full-width">
                            <label class="field-label">IBAN</label>
                            <input type="text" class="field-input" formControlName="iban" placeholder="PK00-XXXX-0000-0000-0000-0000">
                        </div>
                    </div>
                </div>

                <!-- Emergency Contact -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">🚨</div>
                        <h2 class="section-title">Emergency Contact</h2>
                    </div>
                    <div class="form-grid">
                        <div class="form-field">
                            <label class="field-label">Contact Person</label>
                            <input type="text" class="field-input" formControlName="emergencyContactName" placeholder="Enter name">
                        </div>
                        <div class="form-field">
                            <label class="field-label">Relationship</label>
                            <select class="field-input" formControlName="emergencyRelationship">
                                <option value="">Select relationship</option>
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Spouse">Spouse</option>
                                <option value="Sibling">Sibling</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="field-label">Emergency Phone</label>
                            <input type="tel" class="field-input" formControlName="emergencyPhone" placeholder="03XX-XXXXXXX">
                        </div>
                    </div>
                </div>

                <!-- Additional Settings -->
                <div class="form-section">
                    <div class="section-header">
                        <div class="section-icon">⚙️</div>
                        <h2 class="section-title">Additional Settings</h2>
                    </div>
                    <div class="checkbox-container">
                        <mat-checkbox formControlName="isActive" color="primary">Active Status</mat-checkbox>
                        <mat-checkbox formControlName="fieldAccess" color="primary">Field Access</mat-checkbox>
                        <mat-checkbox formControlName="allowLogin" color="primary">Allow System Login</mat-checkbox>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="dialog-footer">
                <div class="footer-info">
                    <span class="required">*</span> Required fields
                </div>
                <div class="footer-actions">
                    <button mat-stroked-button class="btn-cancel" (click)="onCancel()" [disabled]="saving">
                        Cancel
                    </button>
                    <button mat-raised-button class="btn-submit" (click)="onSubmit()" [disabled]="saving || salesmanForm.invalid">
                        <mat-icon *ngIf="!saving">check</mat-icon>
                        <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
                        <span>{{ isEditMode ? 'Update' : 'Register' }} Salesman</span>
                    </button>
                </div>
            </div>
        </div>
    `,
    styleUrl: './salesman-registration-dialog.component.scss'
})
export class SalesmanRegistrationDialogComponent implements OnInit {
    salesmanForm: FormGroup;
    isEditMode = false;
    saving = false;

    towns: any[] = [];
    designations: any[] = [];

    constructor(
        private fb: FormBuilder,
        private supportingService: SupportingMasterService,
        private toastService: ToastService,
        private dialogRef: MatDialogRef<SalesmanRegistrationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { salesman?: Salesman }
    ) {
        this.isEditMode = !!data?.salesman;
        this.salesmanForm = this.createForm();
    }

    ngOnInit(): void {
        this.loadMasterData();
        if (this.isEditMode && this.data.salesman) {
            this.populateForm(this.data.salesman);
        }
    }

    loadMasterData(): void {
        this.supportingService.getTowns().subscribe(res => this.towns = res.data);
        this.supportingService.getDesignations().subscribe(res => this.designations = res.data);
    }

    createForm(): FormGroup {
        return this.fb.group({
            // Personal
            fullName: ['', [Validators.required]],
            fatherName: ['', [Validators.required]],
            cnic: ['', [Validators.required]],
            dateOfBirth: ['', [Validators.required]],
            gender: ['male', [Validators.required]],
            maritalStatus: [''],

            // Contact
            mobile: ['', [Validators.required]],
            alternateMobile: [''],
            email: ['', [Validators.email]],
            permanentAddress: ['', [Validators.required]],
            city: ['', [Validators.required]],
            townId: [''],
            postalCode: [''],

            // Employment
            designation: ['', [Validators.required]],
            department: ['', [Validators.required]],
            joiningDate: ['', [Validators.required]],
            employmentType: [''],
            territory: [''],
            reportingManager: [''],

            // Salary
            basicSalary: [0],
            houseRent: [0],
            conveyance: [0],
            medicalAllowance: [0],
            commissionPercentage: [0],

            // Bank
            bankName: [''],
            accountTitle: [''],
            accountNumber: [''],
            branchName: [''],
            iban: [''],

            // Emergency
            emergencyContactName: [''],
            emergencyRelationship: [''],
            emergencyPhone: [''],

            // Settings
            isActive: [true],
            fieldAccess: [false],
            allowLogin: [false]
        });
    }

    populateForm(salesman: Salesman): void {
        this.salesmanForm.patchValue({
            fullName: salesman.fullName,
            fatherName: salesman.fatherName,
            cnic: salesman.cnic,
            dateOfBirth: salesman.dateOfBirth,
            gender: salesman.gender,
            maritalStatus: salesman.maritalStatus || '',
            mobile: salesman.mobile,
            alternateMobile: salesman.alternateMobile || '',
            email: salesman.email || '',
            permanentAddress: salesman.permanentAddress,
            city: salesman.city,
            townId: salesman.townId || '',
            postalCode: salesman.postalCode || '',
            designation: salesman.designation,
            department: salesman.department,
            joiningDate: salesman.joiningDate,
            employmentType: salesman.employmentType || '',
            territory: salesman.territory || '',
            reportingManager: salesman.reportingManager || '',
            basicSalary: salesman.basicSalary || 0,
            houseRent: salesman.houseRent || 0,
            conveyance: salesman.conveyance || 0,
            medicalAllowance: salesman.medicalAllowance || 0,
            commissionPercentage: salesman.commissionPercentage || 0,
            bankName: salesman.bankName || '',
            accountTitle: salesman.accountTitle || '',
            accountNumber: salesman.accountNumber || '',
            branchName: salesman.branchName || '',
            iban: salesman.iban || '',
            emergencyContactName: salesman.emergencyContactName || '',
            emergencyRelationship: salesman.emergencyRelationship || '',
            emergencyPhone: salesman.emergencyPhone || '',
            isActive: salesman.isActive,
            fieldAccess: salesman.fieldAccess || false,
            allowLogin: salesman.allowLogin || false
        });
    }

    onSubmit(): void {
        if (this.salesmanForm.invalid) {
            this.toastService.warning('Please fill in all required fields correctly');
            return;
        }

        this.saving = true;
        const formValue = this.salesmanForm.value;

        // Create salesman data object
        const salesmanData = {
            ...formValue
        };

        // Simulate API call (replace with actual service call)
        setTimeout(() => {
            this.toastService.success(
                this.isEditMode ? 'Salesman updated successfully' : 'Salesman registered successfully'
            );
            this.dialogRef.close(salesmanData);
        }, 1000);
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
