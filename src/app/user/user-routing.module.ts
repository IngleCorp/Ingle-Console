import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserDashboardComponent } from './user-dashboard/user-dashboard.component';
import { RoleGuard } from '../core/guard/role-guard.guard';

const routes: Routes = [
  {
    path: '',
    component: UserDashboardComponent,  // http://localhost:4200/user
    canActivate: [RoleGuard],
    data: { role: 'staff' },  // Staff-only access
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}