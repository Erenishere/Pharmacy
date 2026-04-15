describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    // Clear localStorage and visit login page
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    cy.visit('/login');
  });

  it('should display login form correctly', () => {
    // Check that login form elements are present
    cy.get('input[formControlName="username"]').should('be.visible');
    cy.get('input[formControlName="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Login');

    // Check form labels and placeholders
    cy.get('mat-label').contains('Username').should('be.visible');
    cy.get('mat-label').contains('Password').should('be.visible');

    // Check for required field indicators
    cy.get('input[formControlName="username"]').should('have.attr', 'required');
    cy.get('input[formControlName="password"]').should('have.attr', 'required');
  });

  it('should show validation errors for empty form submission', () => {
    // Click login button without filling form
    cy.get('button[type="submit"]').click();

    // Check for validation errors
    cy.get('mat-error').should('contain', 'Username is required');
    cy.get('mat-error').should('contain', 'Password is required');
  });

  it('should show validation error for invalid username format', () => {
    // Enter invalid username
    cy.get('input[formControlName="username"]').type('us');
    cy.get('input[formControlName="password"]').type('password123');

    // Trigger validation
    cy.get('button[type="submit"]').click();

    // Check for username validation error
    cy.get('mat-error').should('contain', 'Username must be at least 3 characters');
  });

  it('should show validation error for short password', () => {
    // Enter valid username but short password
    cy.get('input[formControlName="username"]').type('testuser');
    cy.get('input[formControlName="password"]').type('123');

    // Trigger validation
    cy.get('button[type="submit"]').click();

    // Check for password validation error
    cy.get('mat-error').should('contain', 'Password must be at least 6 characters');
  });

  it('should handle successful login and redirect to dashboard', () => {
    // Mock successful login API response
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token-12345',
          user: {
            id: 1,
            username: 'testuser',
            role: 'admin',
            permissions: ['read', 'write', 'admin']
          }
        }
      }
    }).as('loginRequest');

    // Fill in login form
    cy.get('input[formControlName="username"]').type('testuser');
    cy.get('input[formControlName="password"]').type('password123');

    // Submit form
    cy.get('button[type="submit"]').click();

    // Wait for API call and verify request
    cy.wait('@loginRequest').its('request.body').should('deep.equal', {
      username: 'testuser',
      password: 'password123'
    });

    // Verify redirect to dashboard
    cy.url().should('include', '/dashboard');

    // Verify token is stored in localStorage
    cy.window().its('localStorage.authToken').should('equal', 'mock-jwt-token-12345');

    // Verify user data is stored
    cy.window().its('localStorage.user').should('exist');
    cy.window().then((win) => {
      const user = JSON.parse(win.localStorage.getItem('user') || '{}');
      expect(user.username).to.equal('testuser');
      expect(user.role).to.equal('admin');
    });

    // Verify success message
    cy.get('.mat-mdc-snack-bar-container').should('be.visible');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Login successful');
  });

  it('should handle login failure with invalid credentials', () => {
    // Mock failed login API response
    cy.intercept('POST', '**/auth/login', {
      statusCode: 401,
      body: {
        success: false,
        message: 'Invalid username or password'
      }
    }).as('loginRequest');

    // Fill in login form with wrong credentials
    cy.get('input[formControlName="username"]').type('wronguser');
    cy.get('input[formControlName="password"]').type('wrongpassword');

    // Submit form
    cy.get('button[type="submit"]').click();

    // Wait for API call
    cy.wait('@loginRequest');

    // Verify error message is displayed
    cy.get('.mat-mdc-snack-bar-container').should('be.visible');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Invalid username or password');

    // Verify user is not redirected
    cy.url().should('include', '/login');

    // Verify no token is stored
    cy.window().its('localStorage.authToken').should('be.null');
  });

  it('should handle server error during login', () => {
    // Mock server error
    cy.intercept('POST', '**/auth/login', {
      statusCode: 500,
      body: {
        success: false,
        message: 'Internal server error'
      }
    }).as('loginRequest');

    // Fill in login form
    cy.get('input[formControlName="username"]').type('testuser');
    cy.get('input[formControlName="password"]').type('password123');

    // Submit form
    cy.get('button[type="submit"]').click();

    // Wait for API call
    cy.wait('@loginRequest');

    // Verify error message
    cy.get('.mat-mdc-snack-bar-container').should('be.visible');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Login failed');

    // Verify user stays on login page
    cy.url().should('include', '/login');
  });

  it('should handle network error during login', () => {
    // Mock network failure
    cy.intercept('POST', '**/auth/login', {
      forceNetworkError: true
    }).as('loginRequest');

    // Fill in login form
    cy.get('input[formControlName="username"]').type('testuser');
    cy.get('input[formControlName="password"]').type('password123');

    // Submit form
    cy.get('button[type="submit"]').click();

    // Wait for network error
    cy.wait('@loginRequest');

    // Verify error message for network failure
    cy.get('.mat-mdc-snack-bar-container').should('be.visible');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Network error');

    // Verify user stays on login page
    cy.url().should('include', '/login');
  });

  it('should redirect to dashboard if already authenticated', () => {
    // Set authentication token in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'existing-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'existinguser',
        role: 'user'
      }));
    });

    // Visit login page
    cy.visit('/login');

    // Should redirect to dashboard automatically
    cy.url().should('include', '/dashboard');
  });

  it('should handle logout correctly', () => {
    // First login
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'testuser', role: 'admin' }
        }
      }
    });

    cy.get('input[formControlName="username"]').type('testuser');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Verify login success
    cy.url().should('include', '/dashboard');

    // Find and click logout button
    cy.get('[data-cy="logout-button"]').click();

    // Verify redirect to login
    cy.url().should('include', '/login');

    // Verify localStorage is cleared
    cy.window().its('localStorage.authToken').should('be.null');
    cy.window().its('localStorage.user').should('be.null');

    // Verify logout success message
    cy.get('.mat-mdc-snack-bar-container').should('be.visible');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Logged out successfully');
  });

  it('should handle session timeout', () => {
    // Set expired token
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.fake';
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', expiredToken);
      win.localStorage.setItem('user', JSON.stringify({ id: 1, username: 'testuser' }));
    });

    // Visit protected route
    cy.visit('/dashboard');

    // Should redirect to login due to expired token
    cy.url().should('include', '/login');

    // Verify session expired message
    cy.get('.mat-mdc-snack-bar-container').should('be.visible');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Session expired');
  });

  it('should prevent access to protected routes without authentication', () => {
    // Try to access protected route without authentication
    cy.visit('/dashboard');

    // Should redirect to login
    cy.url().should('include', '/login');

    // Verify access denied message
    cy.get('.mat-mdc-snack-bar-container').should('be.visible');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Please login to continue');
  });

  it('should handle role-based access control', () => {
    // Login as regular user (not admin)
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'regularuser', role: 'user', permissions: ['read'] }
        }
      }
    });

    cy.get('input[formControlName="username"]').type('regularuser');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Verify login success
    cy.url().should('include', '/dashboard');

    // Try to access admin-only route
    cy.visit('/admin/users');

    // Should be denied access
    cy.url().should('include', '/dashboard'); // Redirect back to dashboard

    // Verify permission denied message
    cy.get('.mat-mdc-snack-bar-container').should('be.visible');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Access denied');
  });
});
