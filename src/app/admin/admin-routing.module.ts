import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { RoleGuard } from '../core/guard/role-guard.guard';
import { UsersComponent } from './pages/users/users.component';
import { QuillEditorComponent } from './pages/quill-editor/quill-editor.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: 'users', component: UsersComponent },
      { path: 'quill', component: QuillEditorComponent },

        // http://localhost:4200/admin/users
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