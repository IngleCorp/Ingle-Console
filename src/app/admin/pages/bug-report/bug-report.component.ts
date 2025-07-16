import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface BugReport {
  id?: string;
  pageName: string;
  feature: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  reportedBy: string;
  reportedByEmail: string;
  reportedAt: any;
  updatedAt: any;
  reproductionSteps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  browserInfo?: string;
  deviceInfo?: string;
  screenshots?: string[];
  assignedTo?: string;
  resolvedAt?: any;
  notes?: string;
}

@Component({
  selector: 'app-bug-report',
  templateUrl: './bug-report.component.html',
  styleUrls: ['./bug-report.component.scss']
})
export class BugReportComponent implements OnInit, OnDestroy {
  bugReportForm: FormGroup;
  bugReports: BugReport[] = [];
  isLoading = false;
  isSubmitting = false;
  showReportsList = false;
  currentUser: any = null;
  viewMode: 'grid' | 'list' = 'grid';
  filterStatus: string = '';
  filterPriority: string = '';
  sortBy: 'reportedAt' | 'priority' | 'status' = 'reportedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  private destroy$ = new Subject<void>();

  // Page options for dropdown
  pageOptions = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'clients', label: 'Clients Management' },
    { value: 'client-projects', label: 'Client Projects' },
    { value: 'project-board', label: 'Project Board' },
    { value: 'project-tasks', label: 'Project Tasks' },
    { value: 'project-files', label: 'Project Files' },
    { value: 'project-library', label: 'Project Library' },
    { value: 'project-accounts', label: 'Project Accounts' },
    { value: 'project-bills', label: 'Project Bills' },
    { value: 'project-meetings', label: 'Project Meetings' },
    { value: 'project-milestones', label: 'Project Milestones' },
    { value: 'project-tickets', label: 'Project Tickets' },
    { value: 'project-worksheet', label: 'Project Worksheet' },
    { value: 'finance', label: 'Finance Management' },
    { value: 'finance-dashboard', label: 'Finance Dashboard' },
    { value: 'transactions', label: 'Transactions' },
    { value: 'income-expense', label: 'Income vs Expense' },
    { value: 'employee-lending', label: 'Employee Lending' },
    { value: 'salary-payouts', label: 'Salary Payouts' },
    { value: 'invoice', label: 'Invoice Management' },
    { value: 'tasks', label: 'Tasks Management' },
    { value: 'todo', label: 'Todo Management' },
    { value: 'calendar', label: 'Calendar & Events' },
    { value: 'users', label: 'Users Management' },
    { value: 'profile', label: 'Profile Management' },
    { value: 'settings', label: 'Settings' },
    { value: 'cred-vault', label: 'Credential Vault' },
    { value: 'activities', label: 'Activities Log' },
    { value: 'types', label: 'Types Management' },
    { value: 'other', label: 'Other' }
  ];

  // Priority options
  priorityOptions = [
    { value: 'Low', label: 'Low', color: '#10b981', description: 'Minor issue, doesn\'t affect functionality' },
    { value: 'Medium', label: 'Medium', color: '#f59e0b', description: 'Moderate issue, affects some functionality' },
    { value: 'High', label: 'High', color: '#ef4444', description: 'Major issue, significantly affects functionality' },
    { value: 'Critical', label: 'Critical', color: '#7c2d12', description: 'System breaking issue, needs immediate attention' }
  ];

  // Status options
  statusOptions = [
    { value: 'Open', label: 'Open', color: '#ef4444' },
    { value: 'In Progress', label: 'In Progress', color: '#f59e0b' },
    { value: 'Resolved', label: 'Resolved', color: '#10b981' },
    { value: 'Closed', label: 'Closed', color: '#6b7280' }
  ];

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private snackBar: MatSnackBar
  ) {
    this.bugReportForm = this.createForm();
  }

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadBugReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createForm(): FormGroup {
    return this.fb.group({
      pageName: ['', Validators.required],
      feature: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      priority: ['Medium', Validators.required],
      reproductionSteps: [''],
      expectedBehavior: [''],
      actualBehavior: [''],
      browserInfo: [this.getBrowserInfo()],
      deviceInfo: [this.getDeviceInfo()]
    });
  }

  getCurrentUser(): void {
    this.afAuth.authState.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
    });
  }

  loadBugReports(): void {
    this.isLoading = true;
    this.firestore.collection('bugreports', ref => ref.orderBy('reportedAt', 'desc'))
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reports: any[]) => {
          this.bugReports = reports;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading bug reports:', error);
          this.isLoading = false;
          this.snackBar.open('Error loading bug reports', 'Close', { duration: 3000 });
        }
      });
  }

  onSubmit(): void {
    if (this.bugReportForm.valid && this.currentUser) {
      this.isSubmitting = true;
      
      const bugReport: BugReport = {
        ...this.bugReportForm.value,
        status: 'Open',
        reportedBy: this.currentUser.displayName || this.currentUser.email,
        reportedByEmail: this.currentUser.email,
        reportedAt: new Date(),
        updatedAt: new Date()
      };

      this.firestore.collection('bugreports').add(bugReport)
        .then(() => {
          this.snackBar.open('Bug report submitted successfully!', 'Close', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.resetForm();
          this.logActivity('Bug Report', `Bug report submitted for ${bugReport.pageName} - ${bugReport.feature}`);
        })
        .catch(error => {
          console.error('Error submitting bug report:', error);
          this.snackBar.open('Error submitting bug report', 'Close', { 
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    } else {
      this.markFormGroupTouched(this.bugReportForm);
    }
  }

  resetForm(): void {
    this.bugReportForm.reset();
    this.bugReportForm.patchValue({
      priority: 'Medium',
      browserInfo: this.getBrowserInfo(),
      deviceInfo: this.getDeviceInfo()
    });
  }

  updateBugStatus(bugId: string, newStatus: string): void {
    this.firestore.collection('bugreports').doc(bugId).update({
      status: newStatus,
      updatedAt: new Date(),
      ...(newStatus === 'Resolved' && { resolvedAt: new Date() })
    }).then(() => {
      this.snackBar.open(`Bug status updated to ${newStatus}`, 'Close', { duration: 3000 });
      this.logActivity('Bug Status Update', `Bug status changed to ${newStatus}`);
    }).catch(error => {
      console.error('Error updating bug status:', error);
      this.snackBar.open('Error updating bug status', 'Close', { duration: 3000 });
    });
  }

  deleteBugReport(bugId: string): void {
    if (confirm('Are you sure you want to delete this bug report?')) {
      this.firestore.collection('bugreports').doc(bugId).delete()
        .then(() => {
          this.snackBar.open('Bug report deleted successfully', 'Close', { duration: 3000 });
          this.logActivity('Bug Report Deletion', 'Bug report deleted');
        })
        .catch(error => {
          console.error('Error deleting bug report:', error);
          this.snackBar.open('Error deleting bug report', 'Close', { duration: 3000 });
        });
    }
  }

  toggleReportsList(): void {
    this.showReportsList = !this.showReportsList;
  }

  getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';
    else if (userAgent.includes('Opera')) browserName = 'Opera';
    
    return `${browserName} - ${userAgent}`;
  }

  getDeviceInfo(): string {
    return `${navigator.platform} - Screen: ${screen.width}x${screen.height} - Viewport: ${window.innerWidth}x${window.innerHeight}`;
  }

  getPriorityColor(priority: string): string {
    const priorityOption = this.priorityOptions.find(p => p.value === priority);
    return priorityOption?.color || '#6b7280';
  }

  getStatusColor(status: string): string {
    const statusOption = this.statusOptions.find(s => s.value === status);
    return statusOption?.color || '#6b7280';
  }

  formatDate(date: any): string {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.bugReportForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private logActivity(action: string, description: string): void {
    if (this.currentUser) {
      const activity = {
        type: 'bug-report',
        action,
        details: description,
        createdAt: new Date(),
        createdBy: this.currentUser.uid || '',
        createdByName: this.currentUser.displayName || this.currentUser.email || 'Unknown User',
        icon: 'bug_report'
      };
      
      this.firestore.collection('activities').add(activity).catch(error => {
        console.error('Error logging activity:', error);
      });
    }
  }

  // Helper method to get bug reports by status
  getBugReportsByStatus(status: string): BugReport[] {
    return this.bugReports.filter(bug => bug.status === status);
  }

  // Helper method to get bug reports count by priority
  getBugCountByPriority(priority: string): number {
    return this.bugReports.filter(bug => bug.priority === priority).length;
  }

  // View and filter methods
  switchViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  getFilteredAndSortedBugReports(): BugReport[] {
    let filtered = [...this.bugReports];

    // Apply status filter
    if (this.filterStatus) {
      filtered = filtered.filter(bug => bug.status === this.filterStatus);
    }

    // Apply priority filter
    if (this.filterPriority) {
      filtered = filtered.filter(bug => bug.priority === this.filterPriority);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'reportedAt':
          const dateA = a.reportedAt?.toDate ? a.reportedAt.toDate() : new Date(a.reportedAt);
          const dateB = b.reportedAt?.toDate ? b.reportedAt.toDate() : new Date(b.reportedAt);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'priority':
          const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }

  setSortBy(field: 'reportedAt' | 'priority' | 'status'): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
  }

  clearFilters(): void {
    this.filterStatus = '';
    this.filterPriority = '';
    this.sortBy = 'reportedAt';
    this.sortOrder = 'desc';
  }

  getStatusBadgeClass(status: string): string {
    return `status-badge status-${status.toLowerCase().replace(' ', '-')}`;
  }

  getPriorityBadgeClass(priority: string): string {
    return `priority-badge priority-${priority.toLowerCase()}`;
  }
}
