import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';

interface ActivityItem {
  icon: string;
  text: string;
  type: string;
  time: Date;
  createdByName?: string;
}

@Component({
  selector: 'app-admin-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  clientsCount = 0;
  tasksCount = 0;
  financeTotal = 0;
  isLoading = false;
  recentActivity: ActivityItem[] = [];
  userName = localStorage.getItem('username') || 'Unknown';
  // decode user from local storage
  user = JSON.parse(atob(localStorage.getItem('ingle_user') || ''));

  constructor(private afs: AngularFirestore, private router: Router) {}

  ngOnInit(): void {
    this.afs.collection('clients').valueChanges().subscribe((clients: any[]) => {
      this.clientsCount = clients.length;
    });
    this.afs.collection('tasks').valueChanges().subscribe((tasks: any[]) => {
      this.tasksCount = tasks.length;
    });
    this.afs.collection('moneytransactions').valueChanges().subscribe((txs: any[]) => {
      this.financeTotal = txs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    });
    // Fetch recent activities
    this.afs.collection('activities', ref => ref.orderBy('createdAt', 'desc').limit(5))
      .valueChanges()
      .subscribe((activities: any[]) => {
        this.recentActivity = activities.map(activity => {
          // Map type to class and icon for consistent style
          let typeClass = 'other';
          let icon = 'info';
          switch (activity.type) {
            case 'client':
              typeClass = 'clients';
              icon = 'group_add';
              break;
            case 'project':
              typeClass = 'projects';
              icon = 'folder_open';
              break;
            case 'task':
              typeClass = 'tasks';
              icon = 'check_circle';
              break;
            case 'transaction':
              typeClass = 'finance';
              icon = 'account_balance_wallet';
              break;
            case 'calendar':
              typeClass = 'calendar';
              icon = 'event';
              break;
            case 'bug-report':
              typeClass = 'bug-report';
              icon = 'bug_report';
              break;
            default:
              typeClass = activity.type || 'other';
              icon = activity.icon || 'info';
          }
          return {
            icon: icon,
            text: activity.details || activity.action,
            type: typeClass,
            time: activity.createdAt?.toDate ? activity.createdAt.toDate() : activity.createdAt,
            createdByName: activity.createdByName || 'Unknown'
          };
        });
      });
  }

  getCurrentDate(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  }

  getTaskCompletion(): number {
    // Mock completion percentage - you can calculate this from actual task data
    return Math.floor(Math.random() * 30) + 70; // Returns 70-99%
  }

  getCompletedTasks(): number {
    // Mock completed tasks today - you can calculate this from actual task data
    return Math.floor(Math.random() * 8) + 2; // Returns 2-9
  }

  getTodayEvents(): number {
    // Mock today's events - you can calculate this from actual calendar data
    return Math.floor(Math.random() * 5) + 1; // Returns 1-5
  }

  getUpcomingEvents(): number {
    // Mock upcoming events - you can calculate this from actual calendar data
    return Math.floor(Math.random() * 12) + 3; // Returns 3-14
  }

  goToClients() {
    this.router.navigate(['/admin/clients']);
  }
  goToFinance() {
    this.router.navigate(['/admin/finance']);
  }
  goToTasks() {
    this.router.navigate(['/admin/tasks']);
  }
  goToCalendar() {
    this.router.navigate(['/admin/calendar']);
  }
  goToActivities() {
    this.router.navigate(['/admin/activities']);
  }
} 