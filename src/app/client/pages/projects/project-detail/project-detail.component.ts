import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';

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

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {

  project: Project | null = null;
  currentUser: User | null = null;
  isLoading = true;
  error: string | null = null;
  projectId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: AngularFirestore,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadUserAndProject();
  }

  async loadUserAndProject(): Promise<void> {
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

      // Get project ID from route
      this.projectId = this.route.snapshot.paramMap.get('id');
      if (!this.projectId) {
        this.error = 'Project ID not found.';
        return;
      }

      await this.loadProject();

    } catch (error) {
      console.error('Error loading user and project:', error);
      this.error = 'Error loading data. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async loadProject(): Promise<void> {
    if (!this.projectId || !this.currentUser?.clientId) return;

    try {
      const projectDoc = await this.firestore.doc(`projects/${this.projectId}`).get().toPromise();
      
      if (projectDoc?.exists) {
        const projectData = projectDoc.data() as any;
        
        // Verify the project belongs to the current client
        if (projectData.clientId !== this.currentUser.clientId) {
          this.error = 'Access denied. This project does not belong to your client account.';
          return;
        }

        this.project = {
          id: projectDoc.id,
          ...projectData
        } as Project;
      } else {
        this.error = 'Project not found.';
      }

    } catch (error) {
      console.error('Error loading project:', error);
      this.error = 'Error loading project. Please try again.';
    }
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

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : date.toDate();
    return dateObj.toLocaleDateString();
  }

  goBack(): void {
    this.router.navigate(['/client/projects']);
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

} 