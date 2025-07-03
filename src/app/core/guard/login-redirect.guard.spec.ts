import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { LoginRedirectGuard } from './login-redirect.guard';
import { AuthService } from '../services/auth.service';

describe('LoginRedirectGuard', () => {
  let guard: LoginRedirectGuard;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      user$: of(null)
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        LoginRedirectGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(LoginRedirectGuard);
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access to login page when user is not logged in', (done) => {
    (mockAuthService as any).user$ = of(null);
    
    guard.canActivate().subscribe(result => {
      expect(result).toBe(true);
      done();
    });
  });

  it('should redirect admin user to admin route', (done) => {
    const mockUser = { role: 'admin', name: 'Admin User' };
    (mockAuthService as any).user$ = of(mockUser);
    
    guard.canActivate().subscribe(result => {
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
      done();
    });
  });

  it('should redirect staff user to user route', (done) => {
    const mockUser = { role: 'staff', name: 'Staff User' };
    (mockAuthService as any).user$ = of(mockUser);
    
    guard.canActivate().subscribe(result => {
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/user']);
      done();
    });
  });
}); 