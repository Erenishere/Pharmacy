import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const routerMock = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerMock }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and store token', () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: {
            id: 1,
            username: 'testuser',
            role: 'admin',
            permissions: ['read', 'write']
          }
        }
      };

      const loginCredentials = { username: 'testuser', password: 'password123' };

      service.login(loginCredentials).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['apiUrl']}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginCredentials);
      req.flush(mockResponse);

      expect(localStorage.getItem('authToken')).toBe('mock-jwt-token');
    });

    it('should handle login failure', () => {
      const mockError = { success: false, message: 'Invalid credentials' };
      const loginCredentials = { username: 'wronguser', password: 'wrongpass' };

      service.login(loginCredentials).subscribe(
        () => fail('Should have failed'),
        error => expect(error.error).toEqual(mockError)
      );

      const req = httpMock.expectOne(`${service['apiUrl']}/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockError, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('logout', () => {
    it('should clear token and navigate to login', () => {
      localStorage.setItem('authToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, username: 'test' }));

      service.logout();

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('authToken', 'valid-token');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when no token exists', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return stored token', () => {
      const token = 'mock-token';
      localStorage.setItem('authToken', token);
      expect(service.getToken()).toBe(token);
    });

    it('should return null when no token', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('getUser', () => {
    it('should return parsed user object', () => {
      const user = { id: 1, username: 'testuser', role: 'admin' };
      localStorage.setItem('user', JSON.stringify(user));
      expect(service.getUser()).toEqual(user);
    });

    it('should return null when no user data', () => {
      expect(service.getUser()).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should return true for allowed permission', () => {
      const user = { id: 1, username: 'testuser', permissions: ['read', 'write'] };
      localStorage.setItem('user', JSON.stringify(user));
      expect(service.hasPermission('read')).toBe(true);
    });

    it('should return false for denied permission', () => {
      const user = { id: 1, username: 'testuser', permissions: ['read'] };
      localStorage.setItem('user', JSON.stringify(user));
      expect(service.hasPermission('write')).toBe(false);
    });

    it('should return false when no user', () => {
      expect(service.hasPermission('read')).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', () => {
      const mockResponse = {
        success: true,
        data: { token: 'new-token' }
      };

      service.refreshToken().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['apiUrl']}/refresh`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);

      expect(localStorage.getItem('authToken')).toBe('new-token');
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.fake';
      localStorage.setItem('authToken', expiredToken);
      expect(service.isTokenExpired()).toBe(true);
    });

    it('should return false for valid token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.fake`;
      localStorage.setItem('authToken', validToken);
      expect(service.isTokenExpired()).toBe(false);
    });
  });
});
