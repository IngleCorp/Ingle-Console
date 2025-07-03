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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { QuillModule } from 'ngx-quill';
// Import all client dashboard components
import { ClientsListComponent } from './clients-list/clients-list.component';
import { ClientAddComponent } from './client-add/client-add.component';
import { ClientHomeComponent } from './client-home/client-home.component';
import { ClientInfoComponent } from './client-home/client-info/client-info.component';
import { ClientProjectsComponent } from './client-home/client-projects/client-projects.component';
import { ProjectFormComponent } from './client-home/client-projects/project-form/project-form.component';
import { ProjectBoardComponent } from './client-home/client-projects/project-board/project-board.component';
import { ProjectInfoComponent } from './client-home/client-projects/project-board/project-info/project-info.component';
import { ProjectTasksComponent } from './client-home/client-projects/project-board/project-tasks/project-tasks.component';
import { TimetakenComponent } from './client-home/client-projects/project-board/project-tasks/timetaken/timetaken.component';
import { ClientBillsComponent } from './client-home/client-bills/client-bills.component';
import { ProjectFilesComponent } from './client-home/client-projects/project-board/project-files/project-files.component';
import { FileViewerComponent } from './client-home/client-projects/project-board/project-files/file-viewer/file-viewer.component';
import { ProjectAccountsComponent } from './client-home/client-projects/project-board/project-accounts/project-accounts.component';
import { ProjectBillsComponent } from './client-home/client-projects/project-board/project-bills/project-bills.component';
import { ProjectWorksheetComponent } from './client-home/client-projects/project-board/project-worksheet/project-worksheet.component';
import { WorksheetEntryFormComponent } from './client-home/client-projects/project-board/project-worksheet/worksheet-entry-form/worksheet-entry-form.component';
import { ProjectTicketsComponent } from './client-home/client-projects/project-board/project-tickets/project-tickets.component';
import { ProjectTicketFormComponent } from './client-home/client-projects/project-board/project-tickets/project-ticket-form/project-ticket-form.component';
import { ProjectTicketViewComponent } from './client-home/client-projects/project-board/project-tickets/project-ticket-view/project-ticket-view.component';
import { ProjectLibraryComponent } from './client-home/client-projects/project-board/project-library/project-library.component';
import { AddDocumentComponent } from './client-home/client-projects/project-board/project-library/add-document/add-document.component';
import { ViewDocumentComponent } from './client-home/client-projects/project-board/project-library/view-document/view-document.component';
import { OpenDocumentComponent } from './client-home/client-projects/project-board/project-library/open-document/open-document.component';
import { ProjectMeetingsComponent } from './client-home/client-projects/project-board/project-meetings/project-meetings.component';
import { ProjectMilestonesComponent } from './client-home/client-projects/project-board/project-milestones/project-milestones.component';
import { ClientsRoutingModule } from './clients-routing.module';

@NgModule({
  declarations: [
    ClientsListComponent,
    ClientAddComponent,
    ClientHomeComponent,
    ClientInfoComponent,
    ClientProjectsComponent,
    ProjectFormComponent,
    ProjectBoardComponent,
    ProjectInfoComponent,
    ProjectTasksComponent,
    TimetakenComponent,
    ClientBillsComponent,
    ProjectFilesComponent,
    FileViewerComponent,
    ProjectAccountsComponent,
    ProjectBillsComponent,
    ProjectWorksheetComponent,
    WorksheetEntryFormComponent,
    ProjectTicketsComponent,
    ProjectTicketFormComponent,
    ProjectTicketViewComponent,
    ProjectLibraryComponent,
    AddDocumentComponent,
    ViewDocumentComponent,
    OpenDocumentComponent,
    ProjectMeetingsComponent,
    ProjectMilestonesComponent
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
    MatSnackBarModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ClientsRoutingModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatMenuModule,
    MatBadgeModule,
    MatButtonToggleModule,
    QuillModule.forRoot()
  ],
  exports: [
    ClientsListComponent,
    ClientAddComponent,
    ClientHomeComponent,
    ClientInfoComponent,
    ClientProjectsComponent,
    ProjectFormComponent,
    ProjectBoardComponent,
    ProjectInfoComponent,
    ProjectTasksComponent,
    TimetakenComponent,
    ClientBillsComponent,
    ProjectFilesComponent,
    FileViewerComponent,
    ProjectAccountsComponent,
    ProjectBillsComponent,
    ProjectWorksheetComponent,
    WorksheetEntryFormComponent,
    ProjectTicketsComponent,
    ProjectTicketFormComponent,
    ProjectTicketViewComponent,
    ProjectLibraryComponent,
    AddDocumentComponent,
    ViewDocumentComponent,
    OpenDocumentComponent,
    ProjectMeetingsComponent,
    ProjectMilestonesComponent
  ]
})
export class ClientsModule {}
