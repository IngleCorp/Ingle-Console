import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { RoleGuard } from '../core/guard/role-guard.guard';
import { UsersComponent } from './pages/users/users.component';
import { CredVaultComponent } from './pages/cred-vault/cred-vault.component';
import { QuillEditorComponent } from './pages/quill-editor/quill-editor.component';
import { TypesComponent } from './pages/types/types.component';
import { TypesformComponent } from './pages/types/typesform/typesform.component';
import { TodoComponent } from './pages/todo/todo.component';
import { InvoiceComponent } from './pages/invoice/invoice.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { HomeComponent } from './pages/home/home.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { ActivitiesComponent } from './pages/activities/activities.component';
import { BugReportComponent } from './pages/bug-report/bug-report.component';

const routes: Routes = [
  {
    path: '',  // When path is exactly '', redirect to home
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '',
    children: [
      { path: 'users', component: UsersComponent },
      { path: 'cred-vault', component: CredVaultComponent },
      { path: 'quill', component: QuillEditorComponent },
      {
        path: 'finance',
        loadChildren: () => import('./pages/finance/finance.module').then(m => m.FinanceModule)
      },
      { path: 'types', component: TypesComponent },
      { path: 'types/form', component: TypesformComponent },  // Assuming this is the form for types
      { path: 'todo', component: TodoComponent },
      { path: 'invoice', component: InvoiceComponent },
      {path:'cred-vault',component:CredVaultComponent},
      {path: 'tasks', component: TasksComponent},
      {path: 'calendar', component: CalendarComponent},
      {path: 'home', component: HomeComponent},
      { path: 'profile', component: ProfileComponent },
      { path: 'settings', component: SettingsComponent },
      {
        path: 'clients',
        loadChildren: () => import('./pages/clients/clients.module').then(m => m.ClientsModule)
      },
      {
        path: 'activities',
        component: ActivitiesComponent
      },
      {
        path: 'bug-report',
        component: BugReportComponent
      },
    ],
    component: AdminDashboardComponent,  // http://localhost:4200/admin
    canActivate: [RoleGuard],
    data: { role: 'admin' },  // Admin-only access
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}