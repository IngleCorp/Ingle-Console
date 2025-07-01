import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { EventFormComponent } from './event-form/event-form.component';

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  color: string;
  location?: string;
  attendees?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  selectedDate: Date = new Date();
  currentMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  events: CalendarEvent[] = [];
  viewMode: 'month' | 'list' = 'month';
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  months: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  private eventsSub?: Subscription;

  constructor(
    private afs: AngularFirestore,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.generateCalendar();
  }

  ngOnDestroy(): void {
    this.eventsSub?.unsubscribe();
  }

  loadEvents(): void {
    this.eventsSub = this.afs.collection('calendar_events', ref => 
      ref.orderBy('startDate', 'asc')
    ).valueChanges({ idField: 'id' }).subscribe((events: any[]) => {
      this.events = events.map(event => ({
        ...event,
        startDate: event.startDate?.toDate ? event.startDate.toDate() : new Date(event.startDate),
        endDate: event.endDate?.toDate ? event.endDate.toDate() : (event.endDate ? new Date(event.endDate) : undefined),
        createdAt: event.createdAt?.toDate ? event.createdAt.toDate() : new Date(event.createdAt),
        updatedAt: event.updatedAt?.toDate ? event.updatedAt.toDate() : (event.updatedAt ? new Date(event.updatedAt) : undefined)
      }));
      this.generateCalendar();
    });
  }

  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    this.calendarDays = [];
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = this.getEventsForDate(date);
      
      this.calendarDays.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: this.isToday(date),
        isSelected: this.isSameDate(date, this.selectedDate),
        events: dayEvents
      });
    }
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    return this.events.filter(event => {
      const eventDate = new Date(event.startDate);
      return this.isSameDate(eventDate, date);
    });
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return this.isSameDate(date, today);
  }

  isSameDate(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  selectDate(day: CalendarDay): void {
    this.selectedDate = new Date(day.date);
    this.generateCalendar();
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  goToToday(): void {
    this.currentMonth = new Date();
    this.selectedDate = new Date();
    this.generateCalendar();
  }

  addEvent(date?: Date): void {
    const selectedDate = date || this.selectedDate;
    const dialogRef = this.dialog.open(EventFormComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { selectedDate: selectedDate }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Event created successfully');
      }
    });
  }

  editEvent(event: CalendarEvent): void {
    const dialogRef = this.dialog.open(EventFormComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { event: event }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'deleted') {
        console.log('Event deleted successfully');
      } else if (result) {
        console.log('Event updated successfully');
      }
    });
  }

  deleteEvent(event: CalendarEvent): void {
    if (confirm('Are you sure you want to delete this event?')) {
      this.afs.collection('calendar_events').doc(event.id).delete().then(() => {
        console.log('Event deleted successfully');
      }).catch(error => {
        console.error('Error deleting event:', error);
      });
    }
  }

  switchView(mode: 'month' | 'list'): void {
    this.viewMode = mode;
  }

  getMonthName(): string {
    return this.months[this.currentMonth.getMonth()];
  }

  getYear(): number {
    return this.currentMonth.getFullYear();
  }

  getUpcomingEvents(): CalendarEvent[] {
    const now = new Date();
    return this.events.filter(event => new Date(event.startDate) >= now)
                     .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  getPastEvents(): CalendarEvent[] {
    const now = new Date();
    return this.events.filter(event => new Date(event.startDate) < now)
                     .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  getEventColor(event: CalendarEvent): string {
    return event.color || '#667eea';
  }

  formatEventTime(event: CalendarEvent): string {
    if (event.allDay) return 'All Day';
    const startTime = new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (event.endDate) {
      const endTime = new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${startTime} - ${endTime}`;
    }
    return startTime;
  }

  trackByDate(index: number, day: CalendarDay): string {
    return day.date.toISOString();
  }

  trackByEvent(index: number, event: CalendarEvent): string {
    return event.id || index.toString();
  }

  showMoreEvents(day: CalendarDay): void {
    // This will be implemented to show a dialog with all events for the day
    console.log('Show more events for:', day.date, day.events);
  }
}
