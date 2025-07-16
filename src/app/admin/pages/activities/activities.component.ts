import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-activities',
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.scss']
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  activities: any[] = [];
  isLoading = true;
  filterType: string = '';
  searchTerm: string = '';
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'createdAt' | 'type' | 'action' = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  private activitiesSub?: Subscription;

  // Activity type options for filtering
  activityTypes = [
    { value: '', label: 'All Types' },
    { value: 'client', label: 'Client' },
    { value: 'project', label: 'Project' },
    { value: 'task', label: 'Task' },
    { value: 'transaction', label: 'Transaction' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'user', label: 'User' },
    { value: 'bug-report', label: 'Bug Report' }
  ];

  constructor(private afs: AngularFirestore) {}

  ngOnInit(): void {
    this.loadActivities();
  }

  ngOnDestroy(): void {
    this.activitiesSub?.unsubscribe();
  }

  loadActivities(): void {
    this.isLoading = true;
    this.activitiesSub = this.afs.collection('activities', ref => ref.orderBy('createdAt', 'desc'))
      .valueChanges({ idField: 'id' })
      .subscribe((activities: any[]) => {
        this.activities = activities;
        this.isLoading = false;
      });
  }

  get filteredActivities() {
    return this.getFilteredAndSortedActivities();
  }

  // View and filter methods
  switchViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  getFilteredAndSortedActivities(): any[] {
    let filtered = [...this.activities];

    // Apply type filter
    if (this.filterType) {
      filtered = filtered.filter(a => a.type === this.filterType);
    }

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(a => 
        a.details?.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        a.entityName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        a.action?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        a.createdByName?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'createdAt':
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
        case 'action':
          comparison = (a.action || '').localeCompare(b.action || '');
          break;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }

  setSortBy(field: 'createdAt' | 'type' | 'action'): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
  }

  clearFilters(): void {
    this.filterType = '';
    this.searchTerm = '';
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'client': return 'person';
      case 'project': return 'folder';
      case 'task': return 'assignment';
      case 'transaction': return 'monetization_on';
      case 'invoice': return 'receipt';
      case 'user': return 'account_circle';
      case 'bug-report': return 'bug_report';
      default: return 'info';
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case 'client': return '#667eea';
      case 'project': return '#10b981';
      case 'task': return '#f59e0b';
      case 'transaction': return '#ef4444';
      case 'invoice': return '#8b5cf6';
      case 'user': return '#06b6d4';
      case 'bug-report': return '#dc2626';
      default: return '#64748b';
    }
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
} 