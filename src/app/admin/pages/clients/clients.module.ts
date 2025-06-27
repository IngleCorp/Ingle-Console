import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
// Import all client dashboard components
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
import { ClientsRoutingModule } from './clients-routing.module';

@NgModule({
  declarations: [
    ClientsListComponent,
    ClientAddComponent,
    ClientHomeComponent,
    ClientInfoComponent,
    ClientProjectsComponent,
    ProjectBoardComponent,
    ProjectInfoComponent,
    ProjectTasksComponent,
    TimetakenComponent,
    ClientBillsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    ClientsRoutingModule
  ],
  exports: [
    ClientsListComponent,
    ClientAddComponent,
    ClientHomeComponent,
    ClientInfoComponent,
    ClientProjectsComponent,
    ProjectBoardComponent,
    ProjectInfoComponent,
    ProjectTasksComponent,
    TimetakenComponent,
    ClientBillsComponent
  ]
})
export class ClientsModule {}
