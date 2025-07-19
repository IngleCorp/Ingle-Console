import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientDashboardComponent } from './client-dashboard/client-dashboard.component';
import { RoleGuard } from '../core/guard/role-guard.guard';
import { HomeComponent } from './pages/home/home.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { TicketsComponent } from './pages/tickets/tickets.component';
import { TicketFormComponent } from './pages/tickets/ticket-form/ticket-form.component';
import { TicketDetailComponent } from './pages/tickets/ticket-detail/ticket-detail.component';
import { ProjectsComponent } from './pages/projects/projects.component';
import { ProjectDetailComponent } from './pages/projects/project-detail/project-detail.component';
import { DocumentsComponent } from './pages/documents/documents.component';
import { MessagesComponent } from './pages/messages/messages.component';

const routes: Routes = [
  {
    path: '',  // When path is exactly '', redirect to home
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '',
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'tickets', component: TicketsComponent },
      { path: 'tickets/new', component: TicketFormComponent },
      { path: 'tickets/:id', component: TicketDetailComponent },
      { path: 'projects', component: ProjectsComponent },
      { path: 'projects/:id', component: ProjectDetailComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'messages', component: MessagesComponent },
    ],
    component: ClientDashboardComponent,  // http://localhost:4200/client
    canActivate: [RoleGuard],
    data: { role: 'client' },  // Client-only access
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClientRoutingModule {} 