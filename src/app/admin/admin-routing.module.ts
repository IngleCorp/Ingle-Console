import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { RoleGuard } from '../core/guard/role-guard.guard';
import { UsersComponent } from './pages/users/users.component';
import { QuillEditorComponent } from './pages/quill-editor/quill-editor.component';
import { CreateTrasactionComponent } from './pages/finance/create-trasaction/create-trasaction.component';
import { TypesComponent } from './pages/types/types.component';
import { TypesformComponent } from './pages/types/typesform/typesform.component';
import { TodoComponent } from './pages/todo/todo.component';
import { InvoiceComponent } from './pages/invoice/invoice.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: 'users', component: UsersComponent },
      { path: 'quill', component: QuillEditorComponent },
      { path: 'finance/create', component: CreateTrasactionComponent },
      { path: 'types', component: TypesComponent },
      { path: 'types/form', component: TypesformComponent },  // Assuming this is the form for types
      { path: 'todo', component: TodoComponent },
      { path: 'invoice', component: InvoiceComponent },
      

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