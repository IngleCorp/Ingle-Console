import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { CalendarEvent } from '../calendar.component';

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss']
})
export class EventFormComponent implements OnInit {
  eventForm: FormGroup;
  isEditMode = false;
  eventId?: string;
  colorOptions = [
    { name: 'Blue', value: '#667eea' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Indigo', value: '#6366f1' }
  ];

  constructor(
    private fb: FormBuilder,
    private afs: AngularFirestore,
    private dialogRef: MatDialogRef<EventFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { event?: CalendarEvent; selectedDate?: Date }
  ) {
    this.eventForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      startDate: ['', Validators.required],
      startTime: [''],
      endDate: [''],
      endTime: [''],
      allDay: [false],
      color: ['#667eea', Validators.required],
      location: [''],
      attendees: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.event) {
      this.isEditMode = true;
      this.eventId = this.data.event.id;
      this.populateForm(this.data.event);
    } else if (this.data.selectedDate) {
      this.setDefaultDate(this.data.selectedDate);
    }
  }

  populateForm(event: CalendarEvent): void {
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;

    this.eventForm.patchValue({
      title: event.title,
      description: event.description || '',
      startDate: startDate,
      startTime: event.allDay ? '' : startDate.toTimeString().slice(0, 5),
      endDate: endDate,
      endTime: event.allDay || !endDate ? '' : endDate.toTimeString().slice(0, 5),
      allDay: event.allDay,
      color: event.color,
      location: event.location || '',
      attendees: event.attendees ? event.attendees.join(', ') : ''
    });
  }

  setDefaultDate(date: Date): void {
    this.eventForm.patchValue({
      startDate: date,
      startTime: '09:00'
    });
  }

  onAllDayChange(): void {
    const allDay = this.eventForm.get('allDay')?.value;
    if (allDay) {
      this.eventForm.patchValue({
        startTime: '',
        endTime: ''
      });
    } else {
      this.eventForm.patchValue({
        startTime: '09:00'
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.eventForm.valid) {
      const formValue = this.eventForm.value;
      
      // Combine date and time
      const startDateTime = this.combineDateTime(formValue.startDate, formValue.startTime);
      const endDateTime = formValue.endDate && formValue.endTime ? 
        this.combineDateTime(formValue.endDate, formValue.endTime) : 
        (formValue.endDate ? this.combineDateTime(formValue.endDate, '23:59') : undefined);

      const eventData: Partial<CalendarEvent> = {
        title: formValue.title,
        description: formValue.description,
        startDate: startDateTime,
        endDate: endDateTime,
        allDay: formValue.allDay,
        color: formValue.color,
        location: formValue.location,
        attendees: formValue.attendees ? formValue.attendees.split(',').map((a: string) => a.trim()).filter((a: string) => a) : [],
        createdBy: 'current-user', // This should come from auth service
        createdAt: this.isEditMode ? undefined : new Date(),
        updatedAt: new Date()
      };

      try {
        if (this.isEditMode && this.eventId) {
          await this.afs.collection('calendar_events').doc(this.eventId).update(eventData);
        } else {
          await this.afs.collection('calendar_events').add(eventData);
        }
        
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error saving event:', error);
        // Handle error - show notification
      }
    }
  }

  combineDateTime(date: Date, time: string): Date {
    const combined = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      combined.setHours(hours, minutes, 0, 0);
    }
    return combined;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  deleteEvent(): void {
    if (this.eventId && confirm('Are you sure you want to delete this event?')) {
      this.afs.collection('calendar_events').doc(this.eventId).delete()
        .then(() => {
          this.dialogRef.close('deleted');
        })
        .catch(error => {
          console.error('Error deleting event:', error);
        });
    }
  }
}
