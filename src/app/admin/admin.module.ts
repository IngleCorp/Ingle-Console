import '../quill-setup';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { UsersComponent } from './pages/users/users.component';
import { NavComponent } from './nav/nav.component';
import { UserFormComponent } from './pages/users/user-form/user-form.component';
import { CredVaultComponent } from './pages/cred-vault/cred-vault.component';
import { TasksComponent } from './pages/tasks/tasks.component';

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
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Third-party modules
import { AgGridModule } from 'ag-grid-angular';
import { QuillModule } from 'ngx-quill';
import { Angular2SmartTableModule } from 'angular2-smart-table';
// SignaturePadModule removed - using direct signature_pad implementation

// Component imports
import { QuillEditorComponent } from './pages/quill-editor/quill-editor.component';
import { TypesComponent } from './pages/types/types.component';
import { TypesformComponent } from './pages/types/typesform/typesform.component';
import { TypesformDialogComponent } from './pages/types/typesform/typesform-dialog.component';
import { TodoComponent } from './pages/todo/todo.component';
import { TodoFormComponent } from './pages/todo/todo-form/todo-form.component';
import { InvoiceComponent } from './pages/invoice/invoice.component';
import { InvoiceFormComponent } from './pages/invoice/invoice-form/invoice-form.component';
import { InvoicePdfDialogComponent } from './pages/invoice/invoice-pdf-dialog/invoice-pdf-dialog.component';
import { ConfirmDeleteDialogComponent } from './pages/invoice/confirm-delete-dialog/confirm-delete-dialog.component';
import { CategorySelectionDialogComponent } from './pages/invoice/category-selection-dialog/category-selection-dialog.component';
import { TaskFormComponent } from './pages/tasks/task-form/task-form.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { EventFormComponent } from './pages/calendar/event-form/event-form.component';
import { EventsListComponent } from './pages/calendar/events-list/events-list.component';
import { HomeComponent } from './pages/home/home.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { ActivitiesComponent } from './pages/activities/activities.component';
import { BugReportComponent } from './pages/bug-report/bug-report.component';
import { TaskViewComponent } from './pages/tasks/task-view/task-view.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    UsersComponent,
    NavComponent,
    CredVaultComponent,
    TasksComponent,
    UserFormComponent,
    QuillEditorComponent,
    TypesComponent,
    TypesformComponent,
    TypesformDialogComponent,
    TodoComponent,
    TodoFormComponent,
    InvoiceComponent,
    InvoiceFormComponent,
    InvoicePdfDialogComponent,
    ConfirmDeleteDialogComponent,
    CategorySelectionDialogComponent,
    TaskFormComponent,
    CalendarComponent,
    EventFormComponent,
    EventsListComponent,
    HomeComponent,
    ProfileComponent,
    SettingsComponent,
    ActivitiesComponent,
    BugReportComponent,
    TaskViewComponent,
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    
    // Third-party modules
    QuillModule.forRoot(),
    Angular2SmartTableModule,
    AgGridModule,

    // Angular Material Modules
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatSliderModule,
    MatMenuModule,
    MatExpansionModule,
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatPaginatorModule,
    MatDialogModule,
    MatDividerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatRadioModule,
    ClipboardModule,
    DragDropModule,
  ],
})
export class AdminModule {}
