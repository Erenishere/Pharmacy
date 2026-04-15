import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { NavbarComponent } from '../header/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    NavbarComponent,
    SidebarComponent,
    BreadcrumbComponent
  ],
  template: `
    <div class="main-layout" [class.full-page-mode]="isFullPageRoute()">
      <ng-container *ngIf="!isFullPageRoute(); else fullPageContent">
        <app-navbar (toggleSidebar)="sidenav.toggle()"></app-navbar>

        <mat-sidenav-container class="sidenav-container">
          <mat-sidenav #sidenav mode="side" opened class="sidenav">
            <app-sidebar (closeSidebar)="sidenav.close()"></app-sidebar>
          </mat-sidenav>

          <mat-sidenav-content class="main-content">
            <app-breadcrumb></app-breadcrumb>
            <router-outlet></router-outlet>
          </mat-sidenav-content>
        </mat-sidenav-container>
      </ng-container>

      <ng-template #fullPageContent>
        <div class="full-page-content">
          <router-outlet></router-outlet>
        </div>
      </ng-template>
    </div>
  `,
  styleUrl: './main-layout.component.scss'
})

export class MainLayoutComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  constructor(private router: Router) { }

  isFullPageRoute(): boolean {
    const path = this.router.url.split('?')[0];
    return path.startsWith('/account-registration');
  }
}
