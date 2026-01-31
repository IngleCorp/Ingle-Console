import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OwnProjectsListComponent } from './own-projects-list/own-projects-list.component';
import { OwnProjectBoardComponent } from './own-project-board/own-project-board.component';
import { OwnProjectInfoComponent } from './own-project-board/own-project-info/own-project-info.component';
import { OwnProjectTasksComponent } from './own-project-board/own-project-tasks/own-project-tasks.component';
import { OwnProjectAccountsComponent } from './own-project-board/own-project-accounts/own-project-accounts.component';
import { OwnProjectFilesComponent } from './own-project-board/own-project-files/own-project-files.component';
import { OwnProjectTaskDetailComponent } from './own-project-board/own-project-tasks/own-project-task-detail/own-project-task-detail.component';

const routes: Routes = [
  { path: '', component: OwnProjectsListComponent },
  {
    path: ':projectId',
    component: OwnProjectBoardComponent,
    children: [
      { path: '', redirectTo: 'tasks', pathMatch: 'full' },
      { path: 'tasks', component: OwnProjectTasksComponent },
      { path: 'tasks/:taskId', component: OwnProjectTaskDetailComponent },
      { path: 'info', component: OwnProjectInfoComponent },
      { path: 'accounts', component: OwnProjectAccountsComponent },
      { path: 'files', component: OwnProjectFilesComponent },
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OwnProjectsRoutingModule {}
