import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { UserMasterService, User } from '../../services/user-master.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-user-master-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule],
  template: `
    <div class="user-master-container">
      <div class="page-header">
        <h1><mat-icon>people</mat-icon> User Master Management</h1>
        <p>Manage system users and permissions</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>User management interface - To be fully implemented</p>
          <button mat-raised-button color="primary" (click)="loadUsers()">
            <mat-icon>refresh</mat-icon> Load Users
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`.user-master-container { padding: 20px; } .page-header h1 { display: flex; align-items: center; gap: 12px; }`]
})
export class UserMasterListComponent implements OnInit {
  users: User[] = [];

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
          this.toastService.success(`Loaded ${this.users.length} users`);
        }
      },
      error: (err) => this.toastService.error('Failed to load users')
    });
  }
}
