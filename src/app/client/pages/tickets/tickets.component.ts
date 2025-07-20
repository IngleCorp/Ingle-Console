import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.scss']
})
export class TicketsComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

    displayedColumns: string[] = ['title', 'status', 'priority', 'created', 'updated', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  // Filter options
  statusFilter = '';
  priorityFilter = '';
  searchQuery = '';
  isLoading = false;
  currentUser: any;
  selectedProjectId: string = '';
  projects: any[] = [];
  private userSubscription: Subscription = new Subscription();
  private projectsSubscription: Subscription = new Subscription();
  private ticketsSubscription: Subscription = new Subscription();

  // Real data from Firestore
  tickets: any[] = [];

  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  constructor(
    private router: Router,
    private afs: AngularFirestore,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.getCurrentUser();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.projectsSubscription) {
      this.projectsSubscription.unsubscribe();
    }
    if (this.ticketsSubscription) {
      this.ticketsSubscription.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  getCurrentUser(): void {
    this.userSubscription = this.authService.user$.subscribe({
      next: (user) => {
        console.log('User loaded:', user);
        this.currentUser = user;
        if (this.currentUser) {
          this.loadProjects();
        } else {
          console.log('No user or user ID found');
          this.isLoading = false;
          this.projects = [];
          this.tickets = [];
          this.dataSource.data = [];
        }
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.isLoading = false;
        this.projects = [];
        this.tickets = [];
        this.dataSource.data = [];
      }
    });
  }

  loadProjects() {
    if (!this.currentUser || !this.currentUser.clientId) {
      console.log('User not loaded yet, waiting...');
      return;
    }

    this.isLoading = true;
    
    // Get projects where clientId matches current user
    this.projectsSubscription = this.afs.collection('projects', ref => 
      ref.where('clientid', '==', this.currentUser.clientId)
    ).snapshotChanges().subscribe({
      next: (projects) => {
        this.projects = projects.map(project => {
          const projectData = project.payload.doc.data() as any;
          return {
            id: project.payload.doc.id,
            name: projectData.name || 'Unknown Project',
            description: projectData.description || '',
            status: projectData.status || 'active'
          };
        });
        
        // Set the first project as selected (index 0)
        if (this.projects.length > 0) {
          this.selectedProjectId = this.projects[0].id;
          this.loadTickets();
        } else {
          this.isLoading = false;
          this.tickets = [];
          this.dataSource.data = [];
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoading = false;
        this.projects = [];
        this.tickets = [];
        this.dataSource.data = [];
      }
    });
  }

  loadTickets() {
    if (!this.selectedProjectId) {
      this.tickets = [];
      this.dataSource.data = [];
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    
    // Get tickets from the selected project's tickets subcollection
    this.ticketsSubscription = this.afs.collection('projects').doc(this.selectedProjectId)
      .collection('tickets').snapshotChanges().subscribe({
        next: (tickets) => {
          this.tickets = tickets.map(ticket => {
            const ticketData = ticket.payload.doc.data() as any;
            return {
              ...ticketData,
              id: ticket.payload.doc.id,
              projectId: this.selectedProjectId,
              created: ticketData.createdAt ? new Date(ticketData.createdAt.toDate()) : new Date(),
              updated: ticketData.updatedAt ? new Date(ticketData.updatedAt.toDate()) : new Date()
            };
          });
          
          this.dataSource.data = this.tickets;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading tickets:', error);
          this.isLoading = false;
          this.tickets = [];
          this.dataSource.data = [];
        }
      });
  }

  onProjectChange(projectId: string) {
    this.selectedProjectId = projectId;
    this.loadTickets();
  }

  applyFilters() {
    let filteredData = this.tickets;

    // Apply status filter
    if (this.statusFilter) {
      filteredData = filteredData.filter(ticket => ticket.status === this.statusFilter);
    }

    // Apply priority filter
    if (this.priorityFilter) {
      filteredData = filteredData.filter(ticket => ticket.priority === this.priorityFilter);
    }

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filteredData = filteredData.filter(ticket =>
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.number.toLowerCase().includes(query)
      );
    }

    this.dataSource.data = filteredData;
  }

  clearFilters() {
    this.statusFilter = '';
    this.priorityFilter = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  createNewTicket() {
    // Navigate to create new ticket form
    this.router.navigate(['/client/tickets/new']);
  }

  viewTicket(ticket: any) {
    // Navigate to the project tickets subcollection
    this.router.navigate(['/client/projects', ticket.projectId, 'tickets', ticket.id]);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'open': return '#ff6b6b';
      case 'in_progress': return '#4ecdc4';
      case 'resolved': return '#2ed573';
      case 'closed': return '#747d8c';
      default: return '#747d8c';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return '#ff4757';
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#747d8c';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status;
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return priority;
    }
  }
} 