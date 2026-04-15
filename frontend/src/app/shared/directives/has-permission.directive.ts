import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

/**
 * Structural directive to show/hide elements based on user permissions
 * Usage: *appHasPermission="'items.create'" or *appHasPermission="['items.create', 'items.edit']"
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private requiredPermissions: string[] = [];

  @Input() set appHasPermission(permissions: string | string[]) {
    this.requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    const currentUser = this.authService.currentUserValue;

    // Admin has all permissions
    if (currentUser?.role?.toLowerCase() === 'admin') {
      this.viewContainer.createEmbeddedView(this.templateRef);
      return;
    }

    // Check if user has required permissions
    // Handle both old structure (permissions array) and new structure (permissions?.features array)
    const permissions = currentUser?.permissions;
    const userPermissions: string[] = Array.isArray(permissions) 
      ? permissions 
      : (permissions?.features || []);
    
    const hasPermission = this.requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
