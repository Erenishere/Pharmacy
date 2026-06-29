import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy,
} from '@angular/router';

interface StoredRoute {
  handle: DetachedRouteHandle;
  owner: string;
  touchedAt: number;
}

@Injectable()
export class AppRouteReuseStrategy implements RouteReuseStrategy {
  private storedRoutes = new Map<string, DetachedRouteHandle>();
  
  // We explicitly avoid caching these to prevent stale state issues
  private readonly blacklist = ['login', 'edit', 'new', 'create', 'detail'];

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // Only detach (cache) if explicitly marked OR if it's a main list page
    const shouldCache = route.data?.['reuse'] === true || this.isMainListPage(route);
    return shouldCache && !this.isBlacklisted(route);
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (!handle) return;
    const key = this.getResolvedUrl(route);
    this.storedRoutes.set(key, handle);
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = this.getResolvedUrl(route);
    return !!route.routeConfig && !!this.storedRoutes.get(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (!route.routeConfig) return null;
    const key = this.getResolvedUrl(route);
    return this.storedRoutes.get(key) || null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === current.routeConfig;
  }

  private isMainListPage(route: ActivatedRouteSnapshot): boolean {
    const path = route.routeConfig?.path || '';
    // Basic heuristic for main list pages
    return !!path && !path.includes(':') && path.length > 2;
  }

  private isBlacklisted(route: ActivatedRouteSnapshot): boolean {
    const path = route.routeConfig?.path || '';
    return this.blacklist.some(b => path.includes(b));
  }

  private getResolvedUrl(route: ActivatedRouteSnapshot): string {
    // Standard Angular way to get the full path for a route
    return route.pathFromRoot
      .map(v => v.url.map(segment => segment.toString()).join('/'))
      .filter(s => s !== '')
      .join('/');
  }

  clear(): void {
    this.storedRoutes.clear();
  }
}
