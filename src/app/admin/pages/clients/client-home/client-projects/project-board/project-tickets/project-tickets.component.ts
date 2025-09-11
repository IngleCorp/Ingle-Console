import { Component, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabGroup } from '@angular/material/tabs';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ProjectTicketFormComponent } from './project-ticket-form/project-ticket-form.component';
import { ProjectTicketViewComponent } from './project-ticket-view/project-ticket-view.component';

@Component({
  selector: 'app-project-tickets',
  templateUrl: './project-tickets.component.html',
  styleUrls: ['./project-tickets.component.scss']
})
export class ProjectTicketsComponent implements OnInit {
  @ViewChild(MatTabGroup) tabGroup!: MatTabGroup;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  projectId: string | null = null;
  clientId: string | null = null;
  isLoading: boolean = false;
  projectInfo: any = null;
  
  // Data sources for different ticket types
  allTicketsDataSource = new MatTableDataSource<any>([]);
  issueTicketsDataSource = new MatTableDataSource<any>([]);
  faqTicketsDataSource = new MatTableDataSource<any>([]);
  requirementTicketsDataSource = new MatTableDataSource<any>([]);
  bugTicketsDataSource = new MatTableDataSource<any>([]);
  infoTicketsDataSource = new MatTableDataSource<any>([]);

  // Ticket counts
  allCount: number = 0;
  issueCount: number = 0;
  faqCount: number = 0;
  requirementCount: number = 0;
  bugCount: number = 0;
  infoCount: number = 0;

  // Table columns
  displayedColumns: string[] = [
    'createdAt', 
    'type', 
    'title', 
    'number', 
    'status', 
    'updatedAt', 
    'actions'
  ];

  // Ticket types and statuses
  ticketTypes = [
    { value: 'info', title: 'Info' },
    { value: 'requirement', title: 'Requirement' },
    { value: 'issue', title: 'Issue' },
    { value: 'faq', title: 'FAQ' },
    { value: 'bug', title: 'Bug' }
  ];

  ticketStatuses = [
    { value: 'open', title: 'Open' },
    { value: 'progress', title: 'Progress' },
    { value: 'closed', title: 'Closed' },
    { value: 'pending', title: 'Pending' },
    { value: 'hold', title: 'Hold' },
    { value: 'reopened', title: 'Reopened' }
  ];

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    localStorage.setItem('pactivetab', 'tickets');
  }

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    this.clientId = this.route.parent?.parent?.parent?.snapshot.paramMap.get('id') ?? null;
    
    console.log('Project ID:', this.projectId);
    console.log('Client ID:', this.clientId);
    
    this.getProjectInfo();
    this.getTickets();
  }

  getProjectInfo(): void {
    if (!this.projectId) return;
    
    this.afs.collection('projects').doc(this.projectId).valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          console.log('Project info:', data);
          this.projectInfo = data;
        },
        error: (error) => {
          console.error('Error loading project info:', error);
          this.showNotification('Error loading project info', 'error');
        }
      });
  }

  getTickets(): void {
    if (!this.projectId) return;
    
    this.isLoading = true;
    this.afs.collection('projects').doc(this.projectId).collection('tickets', ref => ref.orderBy('createdAt', 'desc'))
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          console.log('Tickets data:', data);
          this.processTicketsData(data || []);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading tickets:', error);
          this.isLoading = false;
          this.showNotification('Error loading tickets', 'error');
        }
      });
  }

  processTicketsData(tickets: any[]): void {
    // Process all tickets
    this.allTicketsDataSource.data = tickets;
    this.allCount = tickets.length;

    // Filter tickets by type
    this.issueTicketsDataSource.data = tickets.filter(ticket => ticket.type === 'issue');
    this.issueCount = this.issueTicketsDataSource.data.length;

    this.faqTicketsDataSource.data = tickets.filter(ticket => ticket.type === 'faq');
    this.faqCount = this.faqTicketsDataSource.data.length;

    this.requirementTicketsDataSource.data = tickets.filter(ticket => ticket.type === 'requirement');
    this.requirementCount = this.requirementTicketsDataSource.data.length;

    this.bugTicketsDataSource.data = tickets.filter(ticket => ticket.type === 'bug');
    this.bugCount = this.bugTicketsDataSource.data.length;

    this.infoTicketsDataSource.data = tickets.filter(ticket => ticket.type === 'info');
    this.infoCount = this.infoTicketsDataSource.data.length;

    // Set up sorting and pagination for all data sources
    this.setupDataSources();
  }

  setupDataSources(): void {
    const dataSources = [
      this.allTicketsDataSource,
      this.issueTicketsDataSource,
      this.faqTicketsDataSource,
      this.requirementTicketsDataSource,
      this.bugTicketsDataSource,
      this.infoTicketsDataSource
    ];

    dataSources.forEach(dataSource => {
      dataSource.sort = this.sort;
      dataSource.paginator = this.paginator;
      dataSource.sortingDataAccessor = (item: any, property: string) => {
        switch (property) {
          case 'createdAt':
            return item.createdAt?.seconds || 0;
          case 'updatedAt':
            return item.updatedAt?.seconds || 0;
          default:
            return item[property];
        }
      };
    });
  }

  addTicket(ticketType?: string): void {
    if (!this.projectId) {
      this.showNotification('Project ID not found', 'error');
      return;
    }

    const dialogRef = this.dialog.open(ProjectTicketFormComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        type: 'add',
        projectId: this.projectId,
        ticketType: ticketType,
        clientId: this.clientId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.getTickets();
        this.showNotification('Ticket added successfully', 'success');
      }
    });
  }

  editTicket(ticket: any): void {
    if (!this.projectId) return;

    const dialogRef = this.dialog.open(ProjectTicketFormComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        type: 'edit',
        projectId: this.projectId,
        ticket: ticket
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.getTickets();
        this.showNotification('Ticket updated successfully', 'success');
      }
    });
  }

  viewTicket(ticket: any): void {
    const dialogRef = this.dialog.open(ProjectTicketViewComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        ticket: ticket,
        projectInfo: this.projectInfo
      }
    });
  }

  deleteTicket(ticket: any): void {
    if (!this.projectId) return;

    if (confirm(`Are you sure you want to delete ticket "${ticket.title}"?`)) {
      this.afs.collection('projects').doc(this.projectId).collection('tickets').doc(ticket.id).delete()
        .then(() => {
          this.getTickets();
          this.showNotification('Ticket deleted successfully', 'success');
        })
        .catch((error) => {
          console.error('Error deleting ticket:', error);
          this.showNotification('Error deleting ticket', 'error');
        });
    }
  }

  updateTicketStatus(ticket: any, newStatus: string): void {
    if (!this.projectId) return;

    this.afs.collection('projects').doc(this.projectId).collection('tickets').doc(ticket.id).update({
      status: newStatus,
      updatedAt: new Date()
    })
    .then(() => {
      this.getTickets();
      this.showNotification(`Ticket status updated to ${newStatus}`, 'success');
    })
    .catch((error) => {
      console.error('Error updating ticket status:', error);
      this.showNotification('Error updating ticket status', 'error');
    });
  }

  copyTicketLink(ticket: any): void {
    const url = `${window.location.origin}/admin/clients/${this.clientId}/projects/${this.projectId}/tickets/${ticket.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showNotification('Ticket link copied to clipboard', 'success');
    });
  }

  shareTicket(ticket: any): void {
    const url = `${window.location.origin}/admin/clients/${this.clientId}/projects/${this.projectId}/tickets/${ticket.id}`;
    const text = `Check out this ticket: ${ticket.title}`;
    
    if (navigator.share) {
      navigator.share({
        title: ticket.title,
        text: text,
        url: url
      });
    } else {
      // Fallback to copying link
      this.copyTicketLink(ticket);
    }
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'open':
        return '#28a745';
      case 'progress':
        return '#007bff';
      case 'closed':
        return '#dc3545';
      case 'pending':
        return '#ffc107';
      case 'hold':
        return '#fd7e14';
      case 'reopened':
        return '#6f42c1';
      default:
        return '#6c757d';
    }
  }

  getTypeIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'info':
        return 'info';
      case 'issue':
        return 'report_problem';
      case 'bug':
        return 'bug_report';
      case 'faq':
        return 'help';
      case 'requirement':
        return 'assignment';
      default:
        return 'article';
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp?.seconds) {
      return 'N/A';
    }
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  applyFilter(event: Event, dataSource: MatTableDataSource<any>): void {
    const filterValue = (event.target as HTMLInputElement).value;
    dataSource.filter = filterValue.trim().toLowerCase();
  }

  tabChange(event: any): void {
    // Handle tab changes if needed
    console.log('Tab changed to index:', event.index);
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

  trackByTicket(index: number, ticket: any): string {
    return ticket.id;
  }
} 