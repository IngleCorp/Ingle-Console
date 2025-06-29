import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

interface Meeting {
  id?: string;
  date: Date;
  participants: string;
  agenda: string;
  duration: string;
  createdAt?: Date;
  createdBy?: string;
  createdByName?: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedByName?: string;
}

@Component({
  selector: 'app-project-meetings',
  templateUrl: './project-meetings.component.html',
  styleUrls: ['./project-meetings.component.scss']
})
export class ProjectMeetingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  projectId: string = '';
  meetings: Meeting[] = [];
  isLoading = false;
  displayedColumns: string[] = ['date', 'participants', 'agenda', 'duration', 'actions'];
  
  // Form for adding/editing meetings
  meetingForm: FormGroup;
  isDialogOpen = false;
  isEditMode = false;
  editingMeetingId: string = '';

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.meetingForm = this.fb.group({
      date: ['', Validators.required],
      participants: ['', Validators.required],
      agenda: ['', Validators.required],
      duration: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') || '';
    this.loadMeetings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMeetings(): void {
    this.isLoading = true;
    
    this.afs.collection('projects')
      .doc(this.projectId)
      .collection('meetings', ref => ref.orderBy('date', 'desc'))
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (meetings: any) => {
          this.meetings = meetings || [];
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading meetings:', error);
          this.isLoading = false;
          this.showNotification('Error loading meetings', 'error');
        }
      });
  }

  openAddMeetingDialog(): void {
    this.isEditMode = false;
    this.editingMeetingId = '';
    this.meetingForm.reset();
    this.isDialogOpen = true;
  }

  openEditMeetingDialog(meeting: Meeting): void {
    this.isEditMode = true;
    this.editingMeetingId = meeting.id || '';
    
    // Convert Firestore timestamp to Date if needed
    const meetingDate = meeting.date instanceof Date ? meeting.date : 
                       (meeting.date as any)?.toDate ? (meeting.date as any).toDate() : 
                       new Date(meeting.date);
    
    this.meetingForm.patchValue({
      date: meetingDate,
      participants: meeting.participants,
      agenda: meeting.agenda,
      duration: meeting.duration
    });
    
    this.isDialogOpen = true;
  }

  saveMeeting(): void {
    if (this.meetingForm.invalid) return;

    const meetingData: Meeting = {
      date: this.meetingForm.value.date,
      participants: this.meetingForm.value.participants,
      agenda: this.meetingForm.value.agenda,
      duration: this.meetingForm.value.duration,
      updatedAt: new Date(),
      updatedBy: localStorage.getItem('uid') || '',
      updatedByName: localStorage.getItem('name') || ''
    };

    if (this.isEditMode) {
      // Update existing meeting
      this.afs.collection('projects')
        .doc(this.projectId)
        .collection('meetings')
        .doc(this.editingMeetingId)
        .update(meetingData)
        .then(() => {
          this.showNotification('Meeting updated successfully', 'success');
          this.closeDialog();
        })
        .catch((error: any) => {
          console.error('Error updating meeting:', error);
          this.showNotification('Error updating meeting', 'error');
        });
    } else {
      // Create new meeting
      meetingData.createdAt = new Date();
      meetingData.createdBy = localStorage.getItem('uid') || '';
      meetingData.createdByName = localStorage.getItem('name') || '';
      
      this.afs.collection('projects')
        .doc(this.projectId)
        .collection('meetings')
        .add(meetingData)
        .then(() => {
          this.showNotification('Meeting created successfully', 'success');
          this.closeDialog();
        })
        .catch((error: any) => {
          console.error('Error creating meeting:', error);
          this.showNotification('Error creating meeting', 'error');
        });
    }
  }

  deleteMeeting(meetingId: string): void {
    if (confirm('Are you sure you want to delete this meeting?')) {
      this.afs.collection('projects')
        .doc(this.projectId)
        .collection('meetings')
        .doc(meetingId)
        .delete()
        .then(() => {
          this.showNotification('Meeting deleted successfully', 'success');
        })
        .catch((error: any) => {
          console.error('Error deleting meeting:', error);
          this.showNotification('Error deleting meeting', 'error');
        });
    }
  }

  closeDialog(): void {
    this.isDialogOpen = false;
    this.meetingForm.reset();
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUpcomingMeetings(): Meeting[] {
    const now = new Date();
    return this.meetings.filter(meeting => {
      const meetingDate = meeting.date instanceof Date ? meeting.date : 
                         (meeting.date as any)?.toDate ? (meeting.date as any).toDate() : 
                         new Date(meeting.date);
      return meetingDate >= now;
    }).slice(0, 5);
  }

  getPastMeetings(): Meeting[] {
    const now = new Date();
    return this.meetings.filter(meeting => {
      const meetingDate = meeting.date instanceof Date ? meeting.date : 
                         (meeting.date as any)?.toDate ? (meeting.date as any).toDate() : 
                         new Date(meeting.date);
      return meetingDate < now;
    });
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }
} 