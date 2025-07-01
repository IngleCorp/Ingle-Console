import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';

interface ActivityItem {
  icon: string;
  text: string;
  type: string;
  time: Date;
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
  recentActivity: ActivityItem[] = [
    { icon: 'group_add', text: 'New client added: Acme Corp', type: 'clients', time: new Date(Date.now() - 1000 * 60 * 10) },
    { icon: 'check_circle', text: 'Task completed: Update website', type: 'tasks', time: new Date(Date.now() - 1000 * 60 * 30) },
    { icon: 'account_balance_wallet', text: 'Finance transaction: +$1,200', type: 'finance', time: new Date(Date.now() - 1000 * 60 * 60) },
    { icon: 'event', text: 'Meeting scheduled: Project Kickoff', type: 'calendar', time: new Date(Date.now() - 1000 * 60 * 90) },
    { icon: 'group', text: 'Client updated: Beta LLC', type: 'clients', time: new Date(Date.now() - 1000 * 60 * 120) },
  ];

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
} 