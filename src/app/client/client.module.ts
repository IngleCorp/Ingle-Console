import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientDashboardComponent } from './client-dashboard/client-dashboard.component';
import { NavComponent } from './nav/nav.component';
// Angular Material Modules
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { ClipboardModule } from '@angular/cdk/clipboard';

// Third-party modules
import { QuillModule } from 'ngx-quill';

// Component imports
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
import { ClientRoutingModule } from './client-routing.module';

@NgModule({
  declarations: [
    ClientDashboardComponent,
    NavComponent,
    HomeComponent,
    ProfileComponent,
    SettingsComponent,
    TicketsComponent,
    TicketFormComponent,
    TicketDetailComponent,
    ProjectsComponent,
    ProjectDetailComponent,
    DocumentsComponent,
    MessagesComponent,
  ],
  imports: [
    CommonModule,
    ClientRoutingModule,
    
    // Third-party modules
    QuillModule.forRoot(),

    // Angular Material Modules
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatSliderModule,
    MatMenuModule,
    MatExpansionModule,
    MatTableModule,
    MatCardModule,
    MatSortModule,
    MatPaginatorModule,
    MatDialogModule,
    MatDividerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatRadioModule,
    MatChipsModule,
    MatBadgeModule,
    ClipboardModule,
  ],
})
export class ClientModule {} 