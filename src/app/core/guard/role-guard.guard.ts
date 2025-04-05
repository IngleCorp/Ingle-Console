import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const expectedRole = route.data['role'];

    return this.auth.user$.pipe(
      map((user) => {
        if (!user) {
          // If no user, redirect to login
          this.router.navigate(['/login']);
          return false;
        }

        if (user.role === expectedRole) {
          return true;
        } else {
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }),
      tap((canActivate) => {
        if (!canActivate) {
          console.warn('Access denied due to role mismatch.');
        }
      })
    );
  }
}