import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-finance-home',
  templateUrl: './finance-home.component.html',
  styleUrls: ['./finance-home.component.scss']
})
export class FinanceHomeComponent implements OnInit, OnDestroy {
  activeTab = 'dashboard';
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateActiveTabFromRoute();
    this.subscribeToRouteChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToRouteChanges(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateActiveTabFromRoute();
      });
  }

  private updateActiveTabFromRoute(): void {
    const currentRoute = this.router.url;
    
    if (currentRoute.includes('/finance/dashboard') || currentRoute === '/admin/finance') {
      this.activeTab = 'dashboard';
    } else if (currentRoute.includes('/finance/create')) {
      this.activeTab = 'create';
    } else if (currentRoute.includes('/finance/transactions')) {
      this.activeTab = 'transactions';
    } else if (currentRoute.includes('/finance/employee-lending')) {
      this.activeTab = 'lending';
    } else if (currentRoute.includes('/finance/income-expense')) {
      this.activeTab = 'reports';
    } else if (currentRoute.includes('/finance/salary-payouts')) {
      this.activeTab = 'salary';
    }
  }

  navigateToTab(tab: string): void {
    this.activeTab = tab;
    
    switch (tab) {
      case 'dashboard':
        this.router.navigate(['/admin/finance/dashboard']);
        break;
      case 'create':
        this.router.navigate(['/admin/finance/create']);
        break;
      case 'transactions':
        this.router.navigate(['/admin/finance/transactions']);
        break;
      case 'lending':
        this.router.navigate(['/admin/finance/employee-lending']);
        break;
      case 'reports':
        this.router.navigate(['/admin/finance/income-expense']);
        break;
      case 'salary':
        this.router.navigate(['/admin/finance/salary-payouts']);
        break;
      default:
        this.router.navigate(['/admin/finance/dashboard']);
    }
  }

  navigateToCreateTransaction(): void {
    this.navigateToTab('create');
  }
}
