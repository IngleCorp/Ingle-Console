import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { GeneralService } from '../../../../core/services/general.service';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-home',
  templateUrl: './client-home.component.html',
  styleUrls: ['./client-home.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('expanded', style({
        opacity: 1,
        transform: 'translateY(0)',
        height: '*'
      })),
      state('collapsed', style({
        opacity: 0,
        transform: 'translateY(-10px)',
        height: '0'
      })),
      transition('expanded <=> collapsed', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class ClientHomeComponent implements OnInit, OnDestroy {
  // Client data properties
  activetab: string = 'projects';
  clientId: string | null = null;
  clientInfo: any = {};
  clientProjects: any[] = [];
  clientBills: any[] = [];
  isHeaderCollapsed: boolean = true;
  currentProjectId: string | null = null;
  currentProjectInfo: any = null;
  
  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private service: GeneralService
  ) { }

  ngOnInit(): void {
    console.log('ClientHomeComponent initialized');
    
    // Listen for client ID changes
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.clientId = params.get('id');
      console.log('Client ID changed to:', this.clientId);
      this.loadClientData();
    });
    
    // Listen for navigation events to detect project route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      console.log('Navigation event:', event.url);
      this.detectProjectRoute();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadClientData(): void {
    if (!this.clientId) return;
    
    // Load all client data
    this.getClientInfo();
    this.getClientProjects();
    this.getClientBills();
    this.detectProjectRoute();
  }

  toggleHeader(): void {
    this.isHeaderCollapsed = !this.isHeaderCollapsed;
  }

  isInProject(): boolean {
    const currentUrl = this.router.url;
    // Check if we're in a project route (e.g., /admin/clients/123/projects/456)
    return currentUrl.includes('/projects/') && currentUrl.split('/').length > 5;
  }

  detectProjectRoute(): void {
    const currentUrl = this.router.url;
    const urlParts = currentUrl.split('/');
    
    // Check if we're in a project route
    const projectIndex = urlParts.findIndex(part => part === 'projects');
    if (projectIndex !== -1 && urlParts[projectIndex + 1]) {
      this.currentProjectId = urlParts[projectIndex + 1];
      this.getCurrentProjectInfo();
    }
  }

  getCurrentProjectInfo(): void {
    if (!this.currentProjectId) return;
    
    this.afs.collection('projects').doc(this.currentProjectId).valueChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.currentProjectInfo = res;
      }, (err: any) => {
        console.log('Error fetching project info:', err);
      });
  }

  getCurrentProjectName(): string {
    return this.currentProjectInfo?.name || 'Project';
  }

  getClientInfo(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).valueChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.clientInfo = res || {};
        console.log('client info:', this.clientInfo);
      }, (err: any) => {
        console.log('Error fetching client info:', err);
      });
  }

  getClientProjects(): void {
    if (!this.clientId) return;
    this.afs.collection('projects', ref => ref.where('clientid', '==', this.clientId))
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.clientProjects = res || [];
        console.log('client projects:', this.clientProjects);
      }, (err: any) => {
        console.log('Error fetching client projects:', err);
      });
  }

  getClientBills(): void {
    if (!this.clientId) return;
    this.afs.collection('bills', ref => ref.where('clientid', '==', this.clientId))
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.clientBills = res || [];
        console.log('client bills:', this.clientBills);
      }, (err: any) => {
        console.log('Error fetching client bills:', err);
      });
  }

  editClient(): void {
    // TODO: Implement edit client functionality
    console.log('Edit client clicked');
  }

  // Helper methods for template
  getProjectsCount(): number {
    return this.clientProjects.length;
  }

  getBillsCount(): number {
    return this.clientBills.length;
  }

  getActiveProjectsCount(): number {
    return this.clientProjects.filter(p => p.status === 'active' || !p.status).length;
  }

  getCompletedProjectsCount(): number {
    return this.clientProjects.filter(p => p.status === 'completed').length;
  }

  getTotalRevenue(): number {
    return this.clientBills.reduce((total, bill) => total + (bill.amount || 0), 0);
  }

  gohome(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  backToClients(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

}
