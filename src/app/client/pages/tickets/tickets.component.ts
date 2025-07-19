import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.scss']
})
export class TicketsComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['id', 'title', 'status', 'priority', 'created', 'updated', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  // Filter options
  statusFilter = '';
  priorityFilter = '';
  searchQuery = '';

  // Mock data
  tickets = [
    {
      id: 'TKT-001',
      title: 'Website login issue',
      description: 'Unable to login to the client portal',
      status: 'open',
      priority: 'high',
      category: 'technical',
      created: new Date('2024-01-15'),
      updated: new Date('2024-01-16'),
      assignedTo: 'Support Team'
    },
    {
      id: 'TKT-002',
      title: 'Project timeline question',
      description: 'Need clarification on project delivery timeline',
      status: 'in_progress',
      priority: 'medium',
      category: 'project',
      created: new Date('2024-01-10'),
      updated: new Date('2024-01-14'),
      assignedTo: 'Project Manager'
    },
    {
      id: 'TKT-003',
      title: 'Invoice payment issue',
      description: 'Payment not reflecting in account',
      status: 'resolved',
      priority: 'high',
      category: 'billing',
      created: new Date('2024-01-05'),
      updated: new Date('2024-01-12'),
      assignedTo: 'Finance Team'
    },
    {
      id: 'TKT-004',
      title: 'Feature request',
      description: 'Request for new dashboard features',
      status: 'open',
      priority: 'low',
      category: 'feature',
      created: new Date('2024-01-18'),
      updated: new Date('2024-01-18'),
      assignedTo: 'Product Team'
    }
  ];

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

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.loadTickets();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadTickets() {
    this.dataSource.data = this.tickets;
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
        ticket.id.toLowerCase().includes(query)
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
    this.router.navigate(['/client/tickets/new']);
  }

  viewTicket(ticket: any) {
    this.router.navigate(['/client/tickets', ticket.id]);
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