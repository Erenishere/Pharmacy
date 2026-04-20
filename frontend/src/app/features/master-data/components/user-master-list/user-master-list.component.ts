import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { UserMasterService, User } from '../../services/user-master.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { DataTableColumn, TableActionClickEvent } from '../../../../shared/models/data-table.model';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';


@Component({
  selector: 'app-user-master-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, DataTableComponent],
  template: `
    <div class="list-page-container items-enhanced-page">
      <div class="list-page-header">
        <div class="header-content">
          <h1 class="page-title"><mat-icon>people</mat-icon> User Master Management</h1>
          <p class="page-subtitle">Manage system users and permissions (Total: {{ users.length }})</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" class="create-btn" (click)="loadUsers()">
            <mat-icon>refresh</mat-icon> Refresh
          </button>
        </div>
      </div>

      <div class="list-page-card">
        <div class="table-wrapper">
          <app-data-table 
            [data]="users"
            [columns]="tableColumns"
            [pageSize]="10"
            [pageSizeOptions]="[10, 25, 50]"
            (actionClick)="onTableAction($event)">
          </app-data-table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import 'styles/shared-list-styles';
    .list-page-card { @include list-card; border: 1px solid $p-border; }
  `]
})
export class UserMasterListComponent implements OnInit {
  users: User[] = [];
  tableColumns: DataTableColumn[] = [
    { key: 'username', label: 'Username', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'type', label: 'Role', getValue: (row) => row.type?.toUpperCase() },
    { key: 'isActive', label: 'Status', getValue: (row) => row.isActive ? 'Active' : 'Inactive' },
    { key: 'actions', label: 'Actions', type: 'action', actions: [
      { icon: 'edit', label: 'Edit', actionKey: 'edit' }
    ]}
  ];

  constructor(
    private userService: UserMasterService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (response) => {
        if (response.success) {
          this.users = response.data;
        }
      },
      error: (err) => this.toastService.error('Failed to load users')
    });
  }

  onTableAction(event: TableActionClickEvent): void {
    const row = event.row as User;
    if (event.action === 'edit') {
      this.toastService.info('User editing to be implemented');
    }
  }
}
