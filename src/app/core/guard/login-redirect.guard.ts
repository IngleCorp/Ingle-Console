import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginRedirectGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.user$.pipe(
      take(1),
      map((user: any) => {
        // Check if user is logged in from auth service
        if (user) {
          return this.redirectUserBasedOnRole(user);
        }
        
        // Fallback: Check localStorage for user data
        const storedUser = this.getStoredUser();
        if (storedUser) {
          return this.redirectUserBasedOnRole(storedUser);
        }
        
        // User is not logged in, allow access to login page
        return true;
      }),
      catchError((error) => {
        console.error('Error in LoginRedirectGuard:', error);
        // On error, check localStorage as fallback
        const storedUser = this.getStoredUser();
        if (storedUser) {
          return of(this.redirectUserBasedOnRole(storedUser));
        }
        return of(true); // Allow access to login page on error
      })
    );
  }

  private redirectUserBasedOnRole(user: any): boolean {
    const role = user.role;
    
    console.log('User already logged in, redirecting based on role:', role);
    
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else if (role === 'client') {
      this.router.navigate(['/client']);
    } else if (role === 'staff') {
      this.router.navigate(['/user']);
    } else {
      // Unknown role, redirect to admin by default
      console.warn('Unknown user role:', role, 'Redirecting to admin');
      this.router.navigate(['/admin']);
    }
    
    return false; // Prevent access to login page
  }

  private getStoredUser(): any {
    try {
      const isLoggedIn = localStorage.getItem('ic_login') === 'true';
      const encodedUser = localStorage.getItem('ingle_user');
      
      if (isLoggedIn && encodedUser) {
        const decodedUser = JSON.parse(atob(encodedUser));
        return decodedUser;
      }
    } catch (error) {
      console.error('Error parsing stored user data:', error);
    }
    
    return null;
  }
} 