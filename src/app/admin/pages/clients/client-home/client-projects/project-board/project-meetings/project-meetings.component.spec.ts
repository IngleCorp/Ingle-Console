import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireModule } from '@angular/fire/compat';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ProjectMeetingsComponent } from './project-meetings.component';

describe('ProjectMeetingsComponent', () => {
  let component: ProjectMeetingsComponent;
  let fixture: ComponentFixture<ProjectMeetingsComponent>;

  const mockActivatedRoute = {
    parent: {
      snapshot: {
        paramMap: {
          get: () => 'test-project-id'
        }
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectMeetingsComponent ],
      imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        MatTableModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        BrowserAnimationsModule,
        AngularFireModule.initializeApp({}),
        AngularFirestoreModule
      ],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectMeetingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty meetings array', () => {
    expect(component.meetings).toEqual([]);
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toEqual(['date', 'participants', 'agenda', 'duration', 'actions']);
  });

  it('should initialize meeting form with required fields', () => {
    expect(component.meetingForm.get('date')).toBeTruthy();
    expect(component.meetingForm.get('participants')).toBeTruthy();
    expect(component.meetingForm.get('agenda')).toBeTruthy();
    expect(component.meetingForm.get('duration')).toBeTruthy();
  });
}); 