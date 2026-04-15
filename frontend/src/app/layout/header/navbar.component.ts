// navbar.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule
  ],
  template: `
    <mat-toolbar class="navbar">
      <!-- Hamburger Menu -->
      <button mat-icon-button class="menu-btn" (click)="toggleSidebar.emit()">
        <mat-icon>menu</mat-icon>
      </button>

      <!-- Logo (visible on mobile) -->
      <div class="mobile-logo">
        <mat-icon class="logo-icon">local_pharmacy</mat-icon>
        <span class="logo-text">Indus<span class="highlight">traders</span></span>
      </div>

      <!-- Global Search -->
      <div class="search-container" *ngIf="!isSalesman">
        <mat-icon class="search-icon">search</mat-icon>
        <input
          type="text"
          class="search-input"
          placeholder="Search items, customers, invoices..."
          [(ngModel)]="searchQuery"
          (keyup.enter)="onSearch()"
        />
        <button mat-icon-button class="search-btn" *ngIf="searchQuery" (click)="clearSearch()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Spacer -->
      <span class="spacer"></span>

      <!-- Right Actions Group -->
      <div class="actions-group">
        <!-- Notifications -->
        <button mat-icon-button class="action-btn notification-btn" [matMenuTriggerFor]="notifMenu">
          <mat-icon [matBadge]="notificationCount > 0 ? notificationCount : null" matBadgeColor="warn" matBadgeSize="small">
            notifications
          </mat-icon>
        </button>

        <!-- User Profile -->
        <button mat-button class="profile-btn" [matMenuTriggerFor]="userMenu">
          <div class="avatar">
            <mat-icon>person</mat-icon>
          </div>
          <div class="user-info">
            <span class="username">{{ currentUser?.username || 'Admin' }}</span>
            <span class="role">{{ (currentUser?.role || 'Guest') | titlecase }}</span>
          </div>
          <mat-icon class="dropdown-icon">expand_more</mat-icon>
        </button>
      </div>

      <!-- Notifications Menu -->
      <mat-menu #notifMenu="matMenu" class="notifications-menu">
        <div class="menu-header">
          <span class="title">Notifications</span>
          <button mat-button class="mark-read" *ngIf="notificationCount > 0">Mark all read</button>
        </div>
        <mat-divider></mat-divider>
        <div class="notification-list">
          <div class="notification-item" *ngIf="notificationCount === 0">
            <mat-icon class="empty-icon">notifications_none</mat-icon>
            <span>No new notifications</span>
          </div>
          <button mat-menu-item class="notification-item" *ngFor="let notif of notifications">
            <mat-icon [class]="notif.type">{{ notif.icon }}</mat-icon>
            <div class="notif-content">
              <span class="notif-text">{{ notif.message }}</span>
              <span class="notif-time">{{ notif.time }}</span>
            </div>
          </button>
        </div>
      </mat-menu>

      <!-- User Menu -->
      <mat-menu #userMenu="matMenu" class="user-menu">
        <div class="menu-user-header">
          <div class="avatar-large">
            <mat-icon>person</mat-icon>
          </div>
          <div class="user-details">
            <span class="name">{{ currentUser?.username || 'Admin User' }}</span>
            <span class="email">{{ currentUser?.email || 'admin@industraders.com' }}</span>
          </div>
        </div>
        <mat-divider></mat-divider>
        <button mat-menu-item routerLink="/profile">
          <mat-icon>account_circle</mat-icon>
          <span>My Profile</span>
        </button>
        <button mat-menu-item routerLink="/master-data" *ngIf="!isSalesman">
          <mat-icon>settings</mat-icon>
          <span>Settings</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item class="logout-btn" (click)="logout()">
          <mat-icon>logout</mat-icon>
          <span>Logout</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
  currentUser: User | null = null;
  searchQuery = '';
  notificationCount = 3;

  notifications = [
    { icon: 'warning', type: 'warning', message: '5 items are running low on stock', time: '2 hours ago' },
    { icon: 'schedule', type: 'danger', message: '3 batches expiring this month', time: '5 hours ago' },
    { icon: 'receipt', type: 'info', message: 'New order received from ABC Pharmacy', time: '1 day ago' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
  }

  get isSalesman(): boolean {
    return this.currentUser?.role === 'sales' || this.currentUser?.role === 'salesman';
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      // Navigate to search results or filter current view
      console.log('Searching for:', this.searchQuery);
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
