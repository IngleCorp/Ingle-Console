import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneralService } from '../../../../../core/services/general.service';
// import { AddProjectComponent } from './add-project/add-project.component'; // Uncomment or update if available

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
  constructor(
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private afs: AngularFirestore,
    private router: Router,
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
    this.afs.collection('projects', ref => ref.where('clientid', '==', this.clientId))
      .valueChanges({ idField: 'id' })
      .subscribe((res: any) => {
        this.clientProjects = res;
        console.log('client projects:', this.clientProjects);
      }, (err: any) => {
        console.log(err);
      });
  }

  getClientName(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).valueChanges().subscribe((res: any) => {
      this.clientName = res?.name || 'Client';
    });
  }

  addProject(): void {
    // TODO: Implement add project dialog
    console.log('Add project clicked');
  }

  editProject(projectId: string): void {
    // TODO: Implement edit project functionality
    console.log('Edit project:', projectId);
  }

  deleteProject(projectId: string): void {
    // TODO: Implement delete project functionality
    console.log('Delete project:', projectId);
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
      console.log('Shortcut created');
    });
  }
}
