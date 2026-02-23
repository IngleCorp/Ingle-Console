import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { take } from 'rxjs/operators';
import { OwnProjectFormComponent, OwnProjectFormData } from '../own-project-form/own-project-form.component';

const OWN_PROJECTS_COLLECTION = 'ownProjects';

@Component({
  selector: 'app-own-projects-list',
  templateUrl: './own-projects-list.component.html',
  styleUrls: ['./own-projects-list.component.scss']
})
export class OwnProjectsListComponent implements OnInit {
  projects: any[] = [];
  isLoading = false;

  constructor(
    private afs: AngularFirestore,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.getProjects();
  }

  /** Convert Firestore Timestamp to Date for DatePipe and other use. */
  private toDate(value: any): Date | null {
    if (value == null) return null;
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  getProjects(): void {
    this.isLoading = true;
    this.afs.collection(OWN_PROJECTS_COLLECTION)
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (res: any) => {
          this.projects = (res || []).map((p: any) => ({
            ...p,
            startDate: this.toDate(p.startDate) ?? p.startDate,
            endDate: this.toDate(p.endDate) ?? p.endDate
          }));
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching own projects:', err);
          this.isLoading = false;
          this.showNotification('Error loading projects', 'error');
        }
      });
  }

  addProject(): void {
    const dialogRef = this.dialog.open(OwnProjectFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {} as OwnProjectFormData,
      disableClose: true,
      panelClass: 'own-project-form-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.getProjects();
        this.showNotification('Project created successfully', 'success');
        if (result.projectId) {
          setTimeout(() => this.router.navigate([result.projectId, 'tasks'], { relativeTo: this.route }), 500);
        }
      }
    });
  }

  editProject(projectId: string, event: Event): void {
    event.stopPropagation();
    // Use take(1) so we only open the dialog once. valueChanges() emits on every doc change,
    // so saving the form would trigger another emission and stack another dialog.
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(projectId).valueChanges().pipe(take(1)).subscribe((projectData: any) => {
      const dialogRef = this.dialog.open(OwnProjectFormComponent, {
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: { projectId, projectData } as OwnProjectFormData,
        disableClose: true,
        panelClass: 'own-project-form-dialog'
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result?.success) {
          this.getProjects();
          this.showNotification('Project updated successfully', 'success');
        }
      });
    });
  }

  deleteProject(projectId: string, projectName: string, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) return;
    this.isLoading = true;
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(projectId).delete()
      .then(() => {
        this.showNotification('Project deleted', 'success');
        this.getProjects();
      })
      .catch(err => {
        this.showNotification('Error deleting project', 'error');
        this.isLoading = false;
      });
  }

  gotoProjectBoard(projectId: string): void {
    this.router.navigate([projectId, 'tasks'], { relativeTo: this.route });
  }

  getActiveCount(): number {
    return this.projects?.filter(p => p.status === 'active' || !p.status)?.length || 0;
  }
  getCompletedCount(): number {
    return this.projects?.filter(p => p.status === 'completed')?.length || 0;
  }
  getPendingCount(): number {
    return this.projects?.filter(p => p.status === 'pending')?.length || 0;
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

  getProjectTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'product': 'Product',
      'internal-tool': 'Internal Tool',
      'ideation': 'Ideation',
      'development': 'Development',
      'other': 'Other'
    };
    return map[type] || type || '—';
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }
}
