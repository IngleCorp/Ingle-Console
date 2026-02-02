import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { OwnProjectsRoutingModule } from './own-projects-routing.module';
import { OwnProjectsListComponent } from './own-projects-list/own-projects-list.component';
import { OwnProjectFormComponent } from './own-project-form/own-project-form.component';
import { OwnProjectBoardComponent } from './own-project-board/own-project-board.component';
import { OwnProjectInfoComponent } from './own-project-board/own-project-info/own-project-info.component';
import { OwnProjectTasksComponent } from './own-project-board/own-project-tasks/own-project-tasks.component';
import { OwnProjectAccountsComponent } from './own-project-board/own-project-accounts/own-project-accounts.component';
import { OwnProjectFilesComponent } from './own-project-board/own-project-files/own-project-files.component';
import { OwnProjectTaskDetailComponent } from './own-project-board/own-project-tasks/own-project-task-detail/own-project-task-detail.component';
import { OwnProjectDesignComponent } from './own-project-board/own-project-design/own-project-design.component';
import { FlowPreviewDialogComponent } from './own-project-board/own-project-design/flow-preview-dialog/flow-preview-dialog.component';
import { OwnProjectWhiteboardComponent } from './own-project-board/own-project-whiteboard/own-project-whiteboard.component';

@NgModule({
  declarations: [
    OwnProjectsListComponent,
    OwnProjectFormComponent,
    OwnProjectBoardComponent,
    OwnProjectInfoComponent,
    OwnProjectTasksComponent,
    OwnProjectTaskDetailComponent,
    OwnProjectDesignComponent,
    FlowPreviewDialogComponent,
    OwnProjectWhiteboardComponent,
    OwnProjectAccountsComponent,
    OwnProjectFilesComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    OwnProjectsRoutingModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatCardModule,
    MatMenuModule,
    MatDividerModule,
    DragDropModule,
  ],
})
export class OwnProjectsModule {}
