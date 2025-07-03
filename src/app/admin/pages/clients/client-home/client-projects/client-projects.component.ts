import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GeneralService } from '../../../../../core/services/general.service';
import { ProjectFormComponent, ProjectFormData } from './project-form/project-form.component';

@Component({
  selector: 'app-client-projects',
  templateUrl: './client-projects.component.html',
  styleUrls: ['./client-projects.component.scss']
})
export class ClientProjectsComponent implements OnInit {
  clientProjects: any;
  clientId: string | null = null;
  clientName: string = '';
  currentUrl: string = '';
  isLoading = false;
  
  constructor(
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private afs: AngularFirestore,
    private router: Router,
    private snackBar: MatSnackBar,
    private service: GeneralService
  ) { }

  ngOnInit(): void {
    localStorage.setItem('pactivetab', 'tasks');
    this.clientId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
    this.getProjects();
    this.getClientName();
    this.currentUrl = this.router.url;
  }

  getProjects(): void {
    if (!this.clientId) return;
    this.isLoading = true;
    this.afs.collection('projects', ref => ref.where('clientid', '==', this.clientId))
      .valueChanges({ idField: 'id' })
      .subscribe((res: any) => {
        this.clientProjects = res;
        this.isLoading = false;
        console.log('client projects:', this.clientProjects);
      }, (err: any) => {
        console.error('Error fetching projects:', err);
        this.isLoading = false;
        this.showNotification('Error loading projects', 'error');
      });
  }

  getClientName(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).valueChanges().subscribe((res: any) => {
      this.clientName = res?.name || 'Client';
    });
  }

  addProject(): void {
    if (!this.clientId || !this.clientName) {
      this.showNotification('Client information not available', 'error');
      return;
    }

    const dialogData: ProjectFormData = {
      clientId: this.clientId,
      clientName: this.clientName
    };

    const dialogRef = this.dialog.open(ProjectFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: dialogData,
      disableClose: true,
      panelClass: 'project-form-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.getProjects(); // Refresh the projects list
        
        if (result.action === 'created') {
          this.showNotification('Project created successfully!', 'success');
          
          // Optionally navigate to the new project
          if (result.projectId) {
            setTimeout(() => {
              this.gotoProjectBoard(result.projectId);
            }, 1000);
          }
        }
      }
    });
  }

  editProject(projectId: string): void {
    if (!this.clientId || !this.clientName) {
      this.showNotification('Client information not available', 'error');
      return;
    }

    // First, get the project data
    this.afs.collection('projects').doc(projectId).valueChanges().subscribe((projectData: any) => {
      if (projectData) {
        const dialogData: ProjectFormData = {
          clientId: this.clientId!,
          clientName: this.clientName,
          projectId: projectId,
          projectData: projectData
        };

        const dialogRef = this.dialog.open(ProjectFormComponent, {
          width: '800px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: dialogData,
          disableClose: true,
          panelClass: 'project-form-dialog-container'
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result && result.success) {
            this.getProjects(); // Refresh the projects list
            
            if (result.action === 'updated') {
              this.showNotification('Project updated successfully!', 'success');
            }
          }
        });
      } else {
        this.showNotification('Project not found', 'error');
      }
    });
  }

  deleteProject(projectId: string): void {
    const projectToDelete = this.clientProjects?.find((p: any) => p.id === projectId);
    
    if (!projectToDelete) {
      this.showNotification('Project not found', 'error');
      return;
    }

    const confirmMessage = `Are you sure you want to delete "${projectToDelete.name}"? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.isLoading = true;
      
      this.afs.collection('projects').doc(projectId).delete().then(() => {
        // Record activity for project deletion
        this.afs.collection('activities').add({
          type: 'project',
          action: 'Deleted',
          entityId: projectId,
          entityName: projectToDelete.name,
          details: `Project deleted: ${projectToDelete.name} for client ${this.clientName}`,
          createdAt: new Date(),
          createdBy: localStorage.getItem('userid') || '',
          createdByName: localStorage.getItem('username') || 'Unknown User',
          icon: 'delete',
          clientId: this.clientId,
          projectId: projectId
        });

        this.showNotification('Project deleted successfully', 'success');
        this.getProjects(); // Refresh the projects list
      }).catch((error) => {
        console.error('Error deleting project:', error);
        this.showNotification('Error deleting project', 'error');
        this.isLoading = false;
      });
    }
  }

  gotoProjectBoard(projectId: string): void {
    this.router.navigate([projectId, 'tasks'], { relativeTo: this.route });
  }

  // Helper methods for template
  getActiveProjectsCount(): number {
    return this.clientProjects?.filter((p: any) => p.status === 'active' || !p.status)?.length || 0;
  }

  getCompletedProjectsCount(): number {
    return this.clientProjects?.filter((p: any) => p.status === 'completed')?.length || 0;
  }

  getPendingProjectsCount(): number {
    return this.clientProjects?.filter((p: any) => p.status === 'pending')?.length || 0;
  }

  getProjectStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': return 'completed';
      case 'pending': return 'pending';
      case 'on-hold': return 'on-hold';
      default: return 'active';
    }
  }

  getProjectIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': return 'check_circle';
      case 'pending': return 'schedule';
      case 'on-hold': return 'pause_circle';
      default: return 'play_circle';
    }
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return 'primary';
    if (progress >= 50) return 'accent';
    return 'warn';
  }

  createShortcut(name: string, iditem: string): void {
    const link = this.currentUrl + '/' + iditem + '/tasks';
    this.afs.collection('shortcuts').add({ 'name': name, 'url': link }).then(() => {
      this.showNotification('Shortcut created successfully', 'success');
    }).catch((error) => {
      console.error('Error creating shortcut:', error);
      this.showNotification('Error creating shortcut', 'error');
    });
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

  // Additional helper methods
  getProjectTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'web-development': 'Web Development',
      'mobile-app': 'Mobile App',
      'design': 'Design',
      'marketing': 'Marketing',
      'consultation': 'Consultation',
      'maintenance': 'Maintenance',
      'other': 'Other'
    };
    return typeLabels[type] || type;
  }

  getPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'low': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'high': return '#f44336';
      case 'urgent': return '#e91e63';
      default: return '#757575';
    }
  }

  formatBudget(budget: number): string {
    if (!budget) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(budget);
  }

  getProjectDuration(startDate: any, endDate: any): string {
    if (!startDate) return '';
    
    const start = startDate.toDate ? startDate.toDate() : new Date(startDate);
    const end = endDate ? (endDate.toDate ? endDate.toDate() : new Date(endDate)) : new Date();
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  }
}
