import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { SupportingMasterService } from '../../services/supporting-master.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { MasterDataFormDialogComponent } from '../master-data-form-dialog/master-data-form-dialog.component';

@Component({
  selector: 'app-supporting-master-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatDialogModule,
    MatChipsModule
  ],
  template: `
    <div class="supporting-master-container">
      <div class="page-header">
        <div class="header-text">
          <h1>Supporting Master Data</h1>
          <p>Manage towns, areas, categories, transporters, and more</p>
        </div>
      </div>

      <div class="main-card">
        <mat-tab-group #tabGroup [(selectedIndex)]="selectedTabIndex" (selectedTabChange)="onTabChange($event)">
          <!-- Transporters -->
          <mat-tab label="Transporters">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Transporters List</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('transporter')">
                  <mat-icon>add</mat-icon> Add Transporter
                </button>
              </div>
              
              <div class="table-container">
                <table mat-table [dataSource]="transporters" class="full-width">
                  <ng-container matColumnDef="code">
                    <th mat-header-cell *matHeaderCellDef>Code</th>
                    <td mat-cell *matCellDef="let item" class="code-cell">{{item.code}}</td>
                  </ng-container>
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let item" class="name-cell">{{item.name}}</td>
                  </ng-container>
                  <ng-container matColumnDef="contact">
                    <th mat-header-cell *matHeaderCellDef>Contact Info</th>
                    <td mat-cell *matCellDef="let item">
                      <div class="contact-cell">
                        <span><mat-icon>person</mat-icon> {{item.contactPerson || 'N/A'}}</span>
                        <span><mat-icon>phone</mat-icon> {{item.phone || 'N/A'}}</span>
                      </div>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="status-badge" [class.active]="item.isActive">
                        {{item.isActive ? 'Active' : 'Inactive'}}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let item">
                      <button mat-icon-button class="edit-btn" (click)="openForm('transporter', item)">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="['code', 'name', 'contact', 'status', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['code', 'name', 'contact', 'status', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Claim Accounts -->
          <mat-tab label="Claim Accounts">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Claim Accounts</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('claim-account')">
                  <mat-icon>add</mat-icon> Add Claim Account
                </button>
              </div>
              
              <div class="table-container">
                <table mat-table [dataSource]="claimAccounts" class="full-width">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Account Name</th>
                    <td mat-cell *matCellDef="let item" class="name-cell">{{item.name}}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="status-badge" [class.active]="item.isActive">
                        {{item.isActive ? 'Active' : 'Inactive'}}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let item">
                      <button mat-icon-button class="edit-btn" (click)="openForm('claim-account', item)">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="['name', 'status', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['name', 'status', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Dimensions -->
          <mat-tab label="Dimensions/Branches">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Dimension Branch ID Locations</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('dimension')">
                  <mat-icon>add</mat-icon> Add Dimension Location
                </button>
              </div>
              
              <div class="table-container">
                <table mat-table [dataSource]="dimensions" class="full-width">
                  <ng-container matColumnDef="code">
                    <th mat-header-cell *matHeaderCellDef>Code</th>
                    <td mat-cell *matCellDef="let item" class="code-cell">{{item.code}}</td>
                  </ng-container>
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Dimension Name</th>
                    <td mat-cell *matCellDef="let item" class="name-cell">{{item.name}}</td>
                  </ng-container>
                  <ng-container matColumnDef="type">
                    <th mat-header-cell *matHeaderCellDef>Type</th>
                    <td mat-cell *matCellDef="let item">{{ formatDimensionType(item.type) }}</td>
                  </ng-container>
                  <ng-container matColumnDef="parent">
                    <th mat-header-cell *matHeaderCellDef>Parent Location</th>
                    <td mat-cell *matCellDef="let item">
                      {{ item.parentDimensionId?.code ? (item.parentDimensionId.code + ' - ' + item.parentDimensionId.name) : 'Root' }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="description">
                    <th mat-header-cell *matHeaderCellDef>Description</th>
                    <td mat-cell *matCellDef="let item">{{item.description || 'N/A'}}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="status-badge" [class.active]="item.isActive">
                        {{item.isActive ? 'Active' : 'Inactive'}}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let item">
                      <button mat-icon-button class="edit-btn" (click)="openForm('dimension', item)">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="['code', 'name', 'type', 'parent', 'description', 'status', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['code', 'name', 'type', 'parent', 'description', 'status', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Salesmen -->
          <mat-tab label="Salesmen">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Salesmen Management</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('salesman')">
                  <mat-icon>add</mat-icon> Add Salesman
                </button>
              </div>
              
              <div class="table-container">
                <table mat-table [dataSource]="salesmen" class="full-width">
                  <ng-container matColumnDef="code">
                    <th mat-header-cell *matHeaderCellDef>Code</th>
                    <td mat-cell *matCellDef="let item" class="code-cell">{{item.code}}</td>
                  </ng-container>
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let item" class="name-cell">{{item.name}}</td>
                  </ng-container>
                  <ng-container matColumnDef="phone">
                    <th mat-header-cell *matHeaderCellDef>Phone</th>
                    <td mat-cell *matCellDef="let item">{{item.phone || '-'}}</td>
                  </ng-container>
                  <ng-container matColumnDef="cnic">
                    <th mat-header-cell *matHeaderCellDef>CNIC</th>
                    <td mat-cell *matCellDef="let item">{{item.cnic || '-'}}</td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="status-badge" [class.active]="item.isActive">
                        {{item.isActive ? 'Active' : 'Inactive'}}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let item">
                      <button mat-icon-button class="edit-btn" (click)="openForm('salesman', item)">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="['code', 'name', 'phone', 'cnic', 'status', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['code', 'name', 'phone', 'cnic', 'status', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>


          <!-- Account Heads -->
          <mat-tab label="Account Heads">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Head Types & Account Heads</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('account-head')">
                  <mat-icon>add</mat-icon> Add Account Head
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="accountHeads" class="full-width">
                  <ng-container matColumnDef="code"><th mat-header-cell *matHeaderCellDef>Code</th><td mat-cell *matCellDef="let i" class="code-cell">{{i.code}}</td></ng-container>
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Head Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Head Type</th><td mat-cell *matCellDef="let i">{{i.type}}</td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i">
                    <button mat-icon-button class="edit-btn" (click)="openForm('account-head', i)"><mat-icon>edit</mat-icon></button>
                  </td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['code', 'name', 'type', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['code', 'name', 'type', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Schemes -->
          <mat-tab label="Schemes">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Pharmaceutical Schemes</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('scheme')">
                  <mat-icon>add</mat-icon> Add Scheme
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="schemes" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Scheme Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="description"><th mat-header-cell *matHeaderCellDef>Description</th><td mat-cell *matCellDef="let i">{{i.description}}</td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i">
                    <button mat-icon-button class="edit-btn" (click)="openForm('scheme', i)"><mat-icon>edit</mat-icon></button>
                  </td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name', 'description', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['name', 'description', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Towns -->
          <mat-tab label="Towns">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Towns Management</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('town')">
                  <mat-icon>add</mat-icon> Add Town
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="towns" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Town Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="region"><th mat-header-cell *matHeaderCellDef>Region</th><td mat-cell *matCellDef="let i">{{i.region || '-'}}</td></ng-container>
                  <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let i">
                    <span class="status-badge" [class.active]="i.isActive">{{i.isActive ? 'Active' : 'Inactive'}}</span>
                  </td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i">
                    <button mat-icon-button class="edit-btn" (click)="openForm('town', i)"><mat-icon>edit</mat-icon></button>
                  </td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name', 'region', 'status', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['name', 'region', 'status', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Areas -->
          <mat-tab label="Areas">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Areas & Routes</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('area')">
                  <mat-icon>add</mat-icon> Add Area
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="areas" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Area Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="town"><th mat-header-cell *matHeaderCellDef>Town</th><td mat-cell *matCellDef="let i">{{i.townId?.name || '-'}}</td></ng-container>
                  <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let i">
                    <span class="status-badge" [class.active]="i.isActive">{{i.isActive ? 'Active' : 'Inactive'}}</span>
                  </td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i">
                    <button mat-icon-button class="edit-btn" (click)="openForm('area', i)"><mat-icon>edit</mat-icon></button>
                  </td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name', 'town', 'status', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['name', 'town', 'status', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Customer Types -->
          <mat-tab label="Customer Types">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Customer Types</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('customer-type')">
                  <mat-icon>add</mat-icon> Add Customer Type
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="customerTypes" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Type Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="description"><th mat-header-cell *matHeaderCellDef>Description</th><td mat-cell *matCellDef="let i">{{i.description || '-'}}</td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i">
                    <button mat-icon-button class="edit-btn" (click)="openForm('customer-type', i)"><mat-icon>edit</mat-icon></button>
                  </td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name', 'description', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['name', 'description', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Companies -->
          <mat-tab label="Companies">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Companies</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('company')">
                  <mat-icon>add</mat-icon> Add Company
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="companies" class="full-width">
                  <ng-container matColumnDef="code"><th mat-header-cell *matHeaderCellDef>Code</th><td mat-cell *matCellDef="let i" class="code-cell">{{i.code}}</td></ng-container>
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="groupType"><th mat-header-cell *matHeaderCellDef>Group Type</th><td mat-cell *matCellDef="let i">{{i.groupType || '-'}}</td></ng-container>
                  <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let i"><span class="status-badge" [class.active]="i.isActive">{{i.isActive ? 'Active' : 'Inactive'}}</span></td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i"><button mat-icon-button class="edit-btn" (click)="openForm('company', i)"><mat-icon>edit</mat-icon></button></td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['code', 'name', 'groupType', 'status', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['code', 'name', 'groupType', 'status', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Company Groups -->
          <mat-tab label="Company Groups">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Company Groups</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('company-group')">
                  <mat-icon>add</mat-icon> Add Company Group
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="companyGroups" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Group Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="company"><th mat-header-cell *matHeaderCellDef>Company</th><td mat-cell *matCellDef="let i">{{i.companyId?.name || '-'}}</td></ng-container>
                  <ng-container matColumnDef="description"><th mat-header-cell *matHeaderCellDef>Description</th><td mat-cell *matCellDef="let i">{{i.description || '-'}}</td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i"><button mat-icon-button class="edit-btn" (click)="openForm('company-group', i)"><mat-icon>edit</mat-icon></button></td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name', 'company', 'description', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['name', 'company', 'description', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Formulas -->
          <mat-tab label="Formulas">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Formulas</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('formula')">
                  <mat-icon>add</mat-icon> Add Formula
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="formulas" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Formula Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="composition"><th mat-header-cell *matHeaderCellDef>Composition</th><td mat-cell *matCellDef="let i">{{i.composition || '-'}}</td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i"><button mat-icon-button class="edit-btn" (click)="openForm('formula', i)"><mat-icon>edit</mat-icon></button></td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name', 'composition', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['name', 'composition', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Formula Sizes -->
          <mat-tab label="Formula Sizes">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Formula Sizes</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('formula-size')">
                  <mat-icon>add</mat-icon> Add Size
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="formulaSizes" class="full-width">
                  <ng-container matColumnDef="formula"><th mat-header-cell *matHeaderCellDef>Formula</th><td mat-cell *matCellDef="let i">{{i.formulaId?.name || '-'}}</td></ng-container>
                  <ng-container matColumnDef="size"><th mat-header-cell *matHeaderCellDef>Size</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.size}}</td></ng-container>
                  <ng-container matColumnDef="strength"><th mat-header-cell *matHeaderCellDef>Strength</th><td mat-cell *matCellDef="let i">{{i.strength || '-'}}</td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i"><button mat-icon-button class="edit-btn" (click)="openForm('formula-size', i)"><mat-icon>edit</mat-icon></button></td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['formula', 'size', 'strength', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['formula', 'size', 'strength', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Categories -->
          <mat-tab label="Categories">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Categories</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('category')">
                  <mat-icon>add</mat-icon> Add Category
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="categories" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Category Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="description"><th mat-header-cell *matHeaderCellDef>Description</th><td mat-cell *matCellDef="let i">{{i.description || '-'}}</td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i"><button mat-icon-button class="edit-btn" (click)="openForm('category', i)"><mat-icon>edit</mat-icon></button></td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name', 'description', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['name', 'description', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Sub Categories -->
          <mat-tab label="Sub Categories">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Sub Categories</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('sub-category')">
                  <mat-icon>add</mat-icon> Add Sub Category
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="subCategories" class="full-width">
                  <ng-container matColumnDef="category"><th mat-header-cell *matHeaderCellDef>Category</th><td mat-cell *matCellDef="let i">{{i.categoryId?.name || '-'}}</td></ng-container>
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Sub Category</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i"><button mat-icon-button class="edit-btn" (click)="openForm('sub-category', i)"><mat-icon>edit</mat-icon></button></td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['category', 'name', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['category', 'name', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>

          <!-- Business Types -->
          <mat-tab label="Business Types">
            <div class="tab-content">
              <div class="table-actions">
                <h3>Business Types</h3>
                <button mat-raised-button class="add-btn" (click)="openForm('business-type')">
                  <mat-icon>add</mat-icon> Add Business Type
                </button>
              </div>
              <div class="table-container">
                <table mat-table [dataSource]="businessTypes" class="full-width">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Type Name</th><td mat-cell *matCellDef="let i" class="name-cell">{{i.name}}</td></ng-container>
                  <ng-container matColumnDef="description"><th mat-header-cell *matHeaderCellDef>Description</th><td mat-cell *matCellDef="let i">{{i.description || '-'}}</td></ng-container>
                  <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let i"><button mat-icon-button class="edit-btn" (click)="openForm('business-type', i)"><mat-icon>edit</mat-icon></button></td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="['name', 'description', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['name', 'description', 'actions'];"></tr>
                </table>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    .supporting-master-container { padding: 24px; max-width: 1400px; margin: 0 auto; background-color: #f8f7fa; min-height: 100vh; }
    .page-header { margin-bottom: 24px; }
    .header-text h1 { margin: 0; font-size: 24px; font-weight: 600; color: #5e5873; border-left: 4px solid #867cf0; padding-left: 12px; }
    .header-text p { margin: 4px 0 0 16px; color: #b8b8b8; font-size: 14px; }
    .main-card { background: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); overflow: hidden; }
    .tab-content { padding: 24px; }
    .table-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .table-actions h3 { margin: 0; font-size: 18px; font-weight: 600; color: #5e5873; }
    .add-btn { background: linear-gradient(118deg, #867cf0, rgba(134, 124, 240, 0.8)) !important; color: #fff !important; box-shadow: 0 0 10px 1px rgba(134, 124, 240, 0.4) !important; font-weight: 500; transition: all 0.25s ease; }
    .add-btn:hover { box-shadow: 0 0 14px 2px rgba(134, 124, 240, 0.6) !important; transform: translateY(-1px); }
    .table-container { background: transparent; }
    .full-width { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
    ::ng-deep .mat-mdc-header-row { background-color: #ffffff !important; height: 48px; }
    ::ng-deep .mat-mdc-header-cell { color: #5e5873 !important; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e9ecef !important; background-color: #ffffff !important; }
    ::ng-deep .mat-mdc-row { background-color: #ffffff !important; border: 1px solid #e9ecef !important; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important; transition: all 0.25s ease; margin-bottom: 8px; }
    ::ng-deep .mat-mdc-row:hover { background-color: #867cf0 !important; border-color: #867cf0 !important; box-shadow: 0 8px 24px rgba(134, 124, 240, 0.35) !important; transform: translateY(-2px); }
    ::ng-deep .mat-mdc-row:hover .mat-mdc-cell, ::ng-deep .mat-mdc-row:hover .code-cell, ::ng-deep .mat-mdc-row:hover .name-cell, ::ng-deep .mat-mdc-row:hover mat-icon, ::ng-deep .mat-mdc-row:hover .contact-cell span { color: #ffffff !important; }
    ::ng-deep .mat-mdc-row:hover .status-badge { border-color: #ffffff !important; color: #ffffff !important; }
    ::ng-deep .mat-mdc-cell { color: #6e6b7b !important; font-size: 14px; padding: 12px 16px; border: none !important; background-color: transparent !important; }
    .code-cell { font-family: monospace; font-weight: 600; color: #867cf0 !important; }
    .name-cell { font-weight: 600; color: #5e5873 !important; }
    .contact-cell { display: flex; flex-direction: column; gap: 4px; }
    .contact-cell span { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6e6b7b !important; }
    .contact-cell mat-icon { font-size: 16px; width: 16px; height: 16px; color: #867cf0 !important; }
    .status-badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; border: 1px solid #ea5455; color: #ea5455; }
    .status-badge.active { border-color: #28c76f; color: #28c76f; }
    .edit-btn { color: #7367f0 !important; }
    ::ng-deep .mat-mdc-tab-header { background-color: #ffffff !important; border-bottom: 1px solid #ebe9f1 !important; }
    ::ng-deep .mat-mdc-tab .mdc-tab__text-label { color: #6e6b7b !important; font-weight: 500; }
    ::ng-deep .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label { color: #867cf0 !important; }
    ::ng-deep .mat-mdc-tab-indicator-active-indicator-color { background-color: #867cf0 !important; }
    ::ng-deep .mat-mdc-table { background-color: transparent !important; }
  `]
})
export class SupportingMasterListComponent implements OnInit, AfterViewInit {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  public transporters: any[] = [];
  public claimAccounts: any[] = [];
  public dimensions: any[] = [];
  public salesmen: any[] = [];
  public accountHeads: any[] = [];
  public schemes: any[] = [];
  public towns: any[] = [];
  public areas: any[] = [];
  public customerTypes: any[] = [];
  public designations: any[] = [];
  public companies: any[] = [];
  public companyGroups: any[] = [];
  public formulas: any[] = [];
  public formulaSizes: any[] = [];
  public categories: any[] = [];
  public subCategories: any[] = [];
  public businessTypes: any[] = [];

  selectedTabIndex = 0;

  private tabMapping: { [key: string]: number } = {
    'transporters': 0,
    'claim-accounts': 1,
    'dimensions': 2,
    'salesmen': 3,
    'account-heads': 4,
    'schemes': 5,
    'towns': 6,
    'areas': 7,
    'customer-types': 8,
    'companies': 9,
    'company-groups': 10,
    'formulas': 11,
    'formula-sizes': 12,
    'categories': 13,
    'sub-categories': 14,
    'business-types': 15
  };

  constructor(
    private supportingService: SupportingMasterService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && this.tabMapping.hasOwnProperty(tab)) {
        this.selectedTabIndex = this.tabMapping[tab];
        this.loadTabData(tab);
      } else {
        this.loadTransporters();
      }
    });
  }

  ngAfterViewInit() {
    // Tab will be selected via selectedTabIndex binding
  }

  private loadTabData(tab: string): void {
    switch (tab) {
      case 'transporters': this.loadTransporters(); break;
      case 'claim-accounts': this.loadClaimAccounts(); break;
      case 'dimensions': this.loadDimensions(); break;
      case 'salesmen': this.loadSalesmen(); break;
      case 'account-heads': this.loadAccountHeads(); break;
      case 'schemes': this.loadSchemes(); break;
      case 'towns': this.loadTowns(); break;
      case 'areas': this.loadAreas(); break;
      case 'customer-types': this.loadCustomerTypes(); break;
      case 'companies': this.loadCompanies(); break;
      case 'company-groups': this.loadCompanyGroups(); break;
      case 'formulas': this.loadFormulas(); break;
      case 'formula-sizes': this.loadFormulaSizes(); break;
      case 'categories': this.loadCategories(); break;
      case 'sub-categories': this.loadSubCategories(); break;
      case 'business-types': this.loadBusinessTypes(); break;
    }
  }

  onTabChange(event: any) {
    const label = event.tab.textLabel;
    switch (label) {
      case 'Transporters': this.loadTransporters(); break;
      case 'Claim Accounts': this.loadClaimAccounts(); break;
      case 'Dimensions/Branches': this.loadDimensions(); break;
      case 'Salesmen': this.loadSalesmen(); break;
      case 'Account Heads': this.loadAccountHeads(); break;
      case 'Schemes': this.loadSchemes(); break;
      case 'Towns': this.loadTowns(); break;
      case 'Areas': this.loadAreas(); break;
      case 'Customer Types': this.loadCustomerTypes(); break;
      case 'Designations': this.loadDesignations(); break;
      case 'Companies': this.loadCompanies(); break;
      case 'Company Groups': this.loadCompanyGroups(); break;
      case 'Formulas': this.loadFormulas(); break;
      case 'Formula Sizes': this.loadFormulaSizes(); break;
      case 'Categories': this.loadCategories(); break;
      case 'Sub Categories': this.loadSubCategories(); break;
      case 'Business Types': this.loadBusinessTypes(); break;
    }
  }

  loadTransporters() {
    this.supportingService.getTransporters().subscribe({
      next: (res) => this.transporters = res.data,
      error: () => this.toastService.error('Failed to load transporters')
    });
  }

  loadClaimAccounts() {
    this.supportingService.getClaimAccounts().subscribe({
      next: (res) => this.claimAccounts = res.data,
      error: () => this.toastService.error('Failed to load claim accounts')
    });
  }

  loadDimensions() {
    this.supportingService.getDimensions({ limit: 1000 }).subscribe({
      next: (res) => this.dimensions = res.data,
      error: () => this.toastService.error('Failed to load dimensions')
    });
  }

  formatDimensionType(type?: string): string {
    if (!type) {
      return 'Branch';
    }

    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  loadSalesmen() {
    this.supportingService.getSalesmen().subscribe({
      next: (res: any) => this.salesmen = res.data?.salesmen || res.data || [],
      error: () => this.toastService.error('Failed to load salesmen')
    });
  }


  loadAccountHeads() {
    this.supportingService.getAccountHeads().subscribe({
      next: (res) => this.accountHeads = res.data,
      error: () => this.toastService.error('Failed to load account heads')
    });
  }

  loadSchemes() {
    this.supportingService.getSchemes().subscribe({
      next: (res) => this.schemes = res.data,
      error: () => this.toastService.error('Failed to load schemes')
    });
  }

  loadTowns() {
    this.supportingService.getTowns().subscribe({
      next: (res) => this.towns = res.data,
      error: () => this.toastService.error('Failed to load towns')
    });
  }

  loadAreas() {
    this.supportingService.getAreas().subscribe({
      next: (res) => this.areas = res.data,
      error: () => this.toastService.error('Failed to load areas')
    });
  }

  loadCustomerTypes() {
    this.supportingService.getCustomerTypes().subscribe({
      next: (res) => this.customerTypes = res.data,
      error: () => this.toastService.error('Failed to load customer types')
    });
  }

  loadDesignations() {
    this.supportingService.getDesignations().subscribe({
      next: (res) => this.designations = res.data,
      error: () => this.toastService.error('Failed to load designations')
    });
  }

  loadCompanies() {
    this.supportingService.getCompanies().subscribe({
      next: (res) => this.companies = res.data,
      error: () => this.toastService.error('Failed to load companies')
    });
  }

  loadCompanyGroups() {
    this.supportingService.getCompanyGroups().subscribe({
      next: (res) => this.companyGroups = res.data,
      error: () => this.toastService.error('Failed to load company groups')
    });
  }

  loadFormulas() {
    this.supportingService.getFormulas().subscribe({
      next: (res) => this.formulas = res.data,
      error: () => this.toastService.error('Failed to load formulas')
    });
  }

  loadFormulaSizes() {
    this.supportingService.getFormulaSizes().subscribe({
      next: (res) => this.formulaSizes = res.data,
      error: () => this.toastService.error('Failed to load formula sizes')
    });
  }

  loadCategories() {
    this.supportingService.getCategories().subscribe({
      next: (res) => this.categories = res.data,
      error: () => this.toastService.error('Failed to load categories')
    });
  }

  loadSubCategories() {
    this.supportingService.getSubCategories().subscribe({
      next: (res) => this.subCategories = res.data,
      error: () => this.toastService.error('Failed to load subcategories')
    });
  }

  loadBusinessTypes() {
    this.supportingService.getBusinessTypes().subscribe({
      next: (res) => this.businessTypes = res.data,
      error: () => this.toastService.error('Failed to load business types')
    });
  }

  openForm(type: string, item?: any) {
    let title = '';
    let fields: string[] = ['name'];

    switch (type) {
      case 'transporter':
        title = 'Transporter';
        fields = ['code', 'name', 'contactPerson', 'phone'];
        break;
      case 'claim-account':
        title = 'Claim Account';
        fields = ['name'];
        break;
      case 'dimension':
        title = 'Dimension Branch Location';
        fields = ['code', 'name', 'type', 'parentDimensionId', 'description'];
        break;
      case 'salesman':
        title = 'Salesman';
        fields = ['name', 'phone', 'cnic', 'fatherName', 'guarantorCnic'];
        break;
      case 'account-head':
        title = 'Account Head';
        fields = ['code', 'name', 'type'];
        break;
      case 'scheme':
        title = 'Scheme';
        fields = [
          'name',
          'companyId',
          'type',
          'group',
          'schemeFormat',
          'discountPercent',
          'claimAccountId',
          'startDate',
          'endDate',
          'minimumQuantity',
          'maximumQuantity',
          'description'
        ];
        break;
      case 'town':
        title = 'Town';
        fields = ['name', 'region'];
        break;
      case 'area':
        title = 'Area';
        fields = ['name', 'townId'];
        break;
      case 'customer-type':
        title = 'Customer Type';
        fields = ['name', 'description'];
        break;
      case 'designation':
        title = 'Designation';
        fields = ['name', 'description'];
        break;
      case 'company':
        title = 'Company';
        fields = ['code', 'name', 'groupType'];
        break;
      case 'company-group':
        title = 'Company Group';
        fields = ['name', 'companyId', 'description'];
        break;
      case 'formula':
        title = 'Formula';
        fields = ['name', 'composition'];
        break;
      case 'formula-size':
        title = 'Formula Size';
        fields = ['formulaId', 'size', 'strength'];
        break;
      case 'category':
        title = 'Category';
        fields = ['name', 'description'];
        break;
      case 'sub-category':
        title = 'Sub Category';
        fields = ['categoryId', 'name', 'description'];
        break;
      case 'business-type':
        title = 'Business Type';
        fields = ['name', 'description'];
        break;
    }

    const dialogRef = this.dialog.open(MasterDataFormDialogComponent, {
      width: '500px',
      data: { type, title, fields, item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshCurrentTab(type);
      }
    });
  }

  refreshCurrentTab(type: string) {
    switch (type) {
      case 'transporter': this.loadTransporters(); break;
      case 'claim-account': this.loadClaimAccounts(); break;
      case 'dimension': this.loadDimensions(); break;
      case 'salesman': this.loadSalesmen(); break;
      case 'account-head': this.loadAccountHeads(); break;
      case 'scheme': this.loadSchemes(); break;
      case 'town': this.loadTowns(); break;
      case 'area': this.loadAreas(); break;
      case 'customer-type': this.loadCustomerTypes(); break;
      case 'designation': this.loadDesignations(); break;
      case 'company': this.loadCompanies(); break;
      case 'company-group': this.loadCompanyGroups(); break;
      case 'formula': this.loadFormulas(); break;
      case 'formula-size': this.loadFormulaSizes(); break;
      case 'category': this.loadCategories(); break;
      case 'sub-category': this.loadSubCategories(); break;
      case 'business-type': this.loadBusinessTypes(); break;
    }
  }
}
