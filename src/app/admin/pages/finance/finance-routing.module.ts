import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanceHomeComponent } from './finance-home/finance-home.component';
import { FinanceDashboardComponent } from './finance-dashboard/finance-dashboard.component';
import { CreateTrasactionComponent } from './create-trasaction/create-trasaction.component';
import { TranasctionsComponent } from './tranasctions/tranasctions.component';
import { EmployeeLendingComponent } from './employee-lending/employee-lending.component';
import { IncomeExpenseComponent } from './income-expense/income-expense.component';
import { SalaryPayoutsComponent } from './salary-payouts/salary-payouts.component';

const routes: Routes = [
  {
    path: '',
    component: FinanceHomeComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: FinanceDashboardComponent
      },
      {
        path: 'create',
        component: CreateTrasactionComponent
      },
      {
        path: 'transactions',
        component: TranasctionsComponent
      },
      {
        path: 'employee-lending',
        component: EmployeeLendingComponent
      },
      {
        path: 'income-expense',
        component: IncomeExpenseComponent
      },
      {
        path: 'salary-payouts',
        component: SalaryPayoutsComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule { } 