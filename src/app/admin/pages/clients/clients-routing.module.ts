import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientsListComponent } from './clients-list/clients-list.component';
import { ClientAddComponent } from './client-add/client-add.component';
import { ClientHomeComponent } from './client-home/client-home.component';
import { ClientInfoComponent } from './client-home/client-info/client-info.component';
import { ClientProjectsComponent } from './client-home/client-projects/client-projects.component';
import { ProjectBoardComponent } from './client-home/client-projects/project-board/project-board.component';
import { ProjectInfoComponent } from './client-home/client-projects/project-board/project-info/project-info.component';
import { ProjectTasksComponent } from './client-home/client-projects/project-board/project-tasks/project-tasks.component';
import { TimetakenComponent } from './client-home/client-projects/project-board/project-tasks/timetaken/timetaken.component';
import { ClientBillsComponent } from './client-home/client-bills/client-bills.component';
import { ProjectFilesComponent } from './client-home/client-projects/project-board/project-files/project-files.component';

const routes: Routes = [
  { path: '', component: ClientsListComponent },
  { path: 'add', component: ClientAddComponent },
  { 
    path: ':id', 
    component: ClientHomeComponent, 
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      { path: 'info', component: ClientInfoComponent },
      { path: 'projects', component: ClientProjectsComponent },
      { path: 'bills', component: ClientBillsComponent },
      { 
        path: 'projects/:projectId', 
        component: ProjectBoardComponent, 
        children: [
          { path: '', redirectTo: 'tasks', pathMatch: 'full' },
          { path: 'info', component: ProjectInfoComponent },
          { path: 'tasks', component: ProjectTasksComponent },
          { path: 'tasksdetail/:tid', component: TimetakenComponent },
          { path: 'files', component: ProjectFilesComponent },
          // Add more child routes for worksheet, accounts, files, etc. as needed
        ]
      },
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientsRoutingModule {}
