import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';

interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
  clientId?: string;
  department: string;
  phone: string;
  avatar?: string;
  isActive: boolean;
}

interface Project {
  id?: string;
  name: string;
  description?: string;
  clientId: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: Date;
  endDate?: Date;
  progress: number;
  budget?: number;
  assignedTo?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {

  // User and client data
  currentUser: User | null = null;
  clientId: string | null = null;
  
  // Projects data
  projects: Project[] = [];
  isLoading = true;
  error: string | null = null;
  
  // Filter and search
  searchTerm = '';
  statusFilter = '';
  priorityFilter = '';
  
  // Pagination
  pageSize = 10;
  currentPage = 0;
  totalProjects = 0;

  constructor(
    private firestore: AngularFirestore,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadUserAndProjects();
  }

  async loadUserAndProjects(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;

      // Get user data from localStorage
      const encodedUser = localStorage.getItem('ingle_user');
      if (!encodedUser) {
        this.error = 'User data not found. Please log in again.';
        return;
      }

      // Decode user data
      this.currentUser = JSON.parse(atob(encodedUser)) as User;
      
      if (!this.currentUser?.clientId) {
        this.error = 'No client assigned to this user. Please contact your administrator.';
        return;
      }

      this.clientId = this.currentUser.clientId;
      await this.loadProjects();

    } catch (error) {
      console.error('Error loading user and projects:', error);
      this.error = 'Error loading data. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async loadProjects(): Promise<void> {
    if (!this.clientId) return;

    try {
      console.log('clientId', this.clientId);
      const projectsSnapshot = await this.firestore
        .collection('projects', ref => ref.where('clientid', '==', this.clientId))
        .get().toPromise();

      this.projects = projectsSnapshot?.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) || [];
      console.log('projects', this.projects);
      this.totalProjects = this.projects.length;
      this.applyFilters();

    } catch (error) {
      console.error('Error loading projects:', error);
      this.error = 'Error loading projects. Please try again.';
    }
  }

  applyFilters(): void {
    let filteredProjects = [...this.projects];

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filteredProjects = filteredProjects.filter(project =>
        project.name.toLowerCase().includes(search) ||
        project.description?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (this.statusFilter) {
      filteredProjects = filteredProjects.filter(project =>
        project.status === this.statusFilter
      );
    }

    // Apply priority filter
    if (this.priorityFilter) {
      filteredProjects = filteredProjects.filter(project =>
        project.priority === this.priorityFilter
      );
    }

    this.projects = filteredProjects;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onPriorityFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.loadProjects(); // Reload original data
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'planning': '#ff9800',
      'in-progress': '#2196f3',
      'completed': '#4caf50',
      'on-hold': '#9e9e9e',
      'cancelled': '#f44336'
    };
    return statusColors[status] || '#666';
  }

  getPriorityColor(priority: string): string {
    const priorityColors: { [key: string]: string } = {
      'low': '#4caf50',
      'medium': '#ff9800',
      'high': '#f44336',
      'urgent': '#9c27b0'
    };
    return priorityColors[priority] || '#666';
  }

  getPriorityIcon(priority: string): string {
    const priorityIcons: { [key: string]: string } = {
      'low': 'arrow_downward',
      'medium': 'remove',
      'high': 'arrow_upward',
      'urgent': 'priority_high'
    };
    return priorityIcons[priority] || 'remove';
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : date.toDate();
    return dateObj.toLocaleDateString();
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

} 