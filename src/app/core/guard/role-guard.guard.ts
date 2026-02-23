import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, take, tap, timeoutWith } from 'rxjs/operators';

/** Max wait for auth state before resolving guard (avoids stuck white screen). */
const AUTH_GUARD_TIMEOUT_MS = 8000;

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
      take(1),
      timeoutWith(
        AUTH_GUARD_TIMEOUT_MS,
        of(null).pipe(
          tap(() => console.warn('RoleGuard: auth state timeout, redirecting to login'))
        )
      ),
      map((user) => {
        if (!user) {
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