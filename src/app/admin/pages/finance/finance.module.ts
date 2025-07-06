import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

// Routing
import { FinanceRoutingModule } from './finance-routing.module';

// Components
import { FinanceDashboardComponent } from './finance-dashboard/finance-dashboard.component';
import { CreateTrasactionComponent } from './create-trasaction/create-trasaction.component';
import { TranasctionsComponent } from './tranasctions/tranasctions.component';
import { IncomeExpenseComponent } from './income-expense/income-expense.component';
import { SalaryPayoutsComponent } from './salary-payouts/salary-payouts.component';
import { EmployeeLendingComponent, ReturnLendingDialogComponent } from './employee-lending/employee-lending.component';
import { FinanceHomeComponent } from './finance-home/finance-home.component';

@NgModule({
  declarations: [
    FinanceDashboardComponent,
    CreateTrasactionComponent,
    TranasctionsComponent,
    IncomeExpenseComponent,
    SalaryPayoutsComponent,
    EmployeeLendingComponent,
    ReturnLendingDialogComponent,
    FinanceHomeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FinanceRoutingModule,
    
    // Angular Material Modules
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatMenuModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatDividerModule,
    MatTooltipModule,
    MatSlideToggleModule
  ]
})
export class FinanceModule { } 