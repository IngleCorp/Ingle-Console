import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { UsersComponent } from './pages/users/users.component';
import { NavComponent } from './nav/nav.component';
import { UserFormComponent } from './pages/users/user-form/user-form.component';

// import { AppModule } from '../app.module';

// Angular Material Modules
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
// ✅ Import AgGridModule Correctly (No need for `ClientSideRowModelModule`)
import { AgGridModule } from 'ag-grid-angular';
import { QuillEditorComponent } from './pages/quill-editor/quill-editor.component';

import { QuillModule } from 'ngx-quill';
import { TranasctionsComponent } from './pages/finance/tranasctions/tranasctions.component';
import { CreateTrasactionComponent } from './pages/finance/create-trasaction/create-trasaction.component';
import { TypesComponent } from './pages/types/types.component';
import { Angular2SmartTableModule } from 'angular2-smart-table';
import { TypesformComponent } from './pages/types/typesform/typesform.component';
import { TodoComponent } from './pages/todo/todo.component';
import { TodoFormComponent } from './pages/todo/todo-form/todo-form.component';
import { InvoiceComponent } from './pages/invoice/invoice.component';
import { InvoiceFormComponent } from './pages/invoice/invoice-form/invoice-form.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    UsersComponent,
    NavComponent,
    UserFormComponent,
    QuillEditorComponent,
    TranasctionsComponent,
    CreateTrasactionComponent,
    TypesComponent,
    TypesformComponent,
    TodoComponent,
    TodoFormComponent,
    InvoiceComponent,
    InvoiceFormComponent,
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    QuillModule.forRoot(),
    Angular2SmartTableModule,
    // AppModule,

    // Angular Material Modules
    MatToolbarModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatExpansionModule,
    MatMenuModule,
    MatSidenavModule,
    MatSliderModule,
    MatIconModule,
    MatListModule,
    MatFormFieldModule,
    FormsModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatPaginatorModule,
    // ✅ Keep only AgGridModule (Do NOT import `ClientSideRowModelModule`)
    AgGridModule,
    MatDialogModule,
    MatDividerModule
  ],
})
export class AdminModule {}