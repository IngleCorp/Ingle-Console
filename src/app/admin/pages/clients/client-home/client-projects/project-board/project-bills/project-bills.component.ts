import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InvoiceService } from './invoice.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-project-bills',
  templateUrl: './project-bills.component.html',
  styleUrls: ['./project-bills.component.scss']
})
export class ProjectBillsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  projectId: string | null = null;
  bills: any[] = [];
  filteredBills: any[] = [];
  isLoading: boolean = false;
  searchTerm: string = '';
  selectedStatus: string = '';
  errorMessage: string = '';

  // Bill status options
  statusOptions = [
    { value: '', label: 'All Status', icon: 'receipt', color: '#6c757d' },
    { value: 'pending', label: 'Pending', icon: 'schedule', color: '#ff9800' },
    { value: 'paid', label: 'Paid', icon: 'check_circle', color: '#4caf50' },
    { value: 'overdue', label: 'Overdue', icon: 'warning', color: '#f44336' },
    { value: 'draft', label: 'Draft', icon: 'edit', color: '#9e9e9e' }
  ];

  // Computed properties for statistics
  get totalBills(): number {
    return this.bills.length;
  }

  get pendingBills(): number {
    return this.bills.filter(bill => bill.status === 'pending').length;
  }

  get paidBills(): number {
    return this.bills.filter(bill => bill.status === 'paid').length;
  }

  get overdueBills(): number {
    return this.bills.filter(bill => bill.status === 'overdue').length;
  }

  get draftBills(): number {
    return this.bills.filter(bill => bill.status === 'draft').length;
  }

  get totalAmount(): number {
    return this.bills.reduce((sum, bill) => sum + (bill.billtotal || bill.total || 0), 0);
  }

  get totalBalanceDue(): number {
    return this.bills.reduce((sum, bill) => sum + (bill.balencedue || bill.balanceDue || 0), 0);
  }

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private invoiceService: InvoiceService
  ) { }

  ngOnInit(): void {
    localStorage.setItem('pactivetab', 'bills');
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    console.log('Project ID:', this.projectId);
    console.log('Route params:', this.route.parent?.snapshot.paramMap);
    
    if (!this.projectId) {
      this.errorMessage = 'Project ID not found. Please navigate back to the project.';
      return;
    }
    
    this.getProjectBills();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getProjectBills(): void {
    if (!this.projectId) {
      this.errorMessage = 'Project ID not found. Please navigate back to the project.';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.errorMessage = 'Request timeout. Please check your connection and try again.';
        this.showNotification('Request timeout', 'error');
      }
    }, 30000); // 30 seconds timeout
    
    this.afs.collection('invoices', ref => ref.where('projectId', '==', this.projectId))
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          clearTimeout(timeout);
          console.log('Project invoices:', data);
          this.bills = data || [];
          this.filteredBills = [...this.bills];
          this.isLoading = false;
          
          if (this.bills.length === 0) {
            console.log('No invoices found for project:', this.projectId);
            this.showNotification('No invoices found for this project', 'info');
          } else {
            this.showNotification(`Loaded ${this.bills.length} invoices successfully`, 'success');
          }
        },
        error: (error) => {
          clearTimeout(timeout);
          console.error('Error fetching invoices:', error);
          this.isLoading = false;
          this.errorMessage = 'Failed to load invoices. Please check your connection and try again.';
          this.showNotification('Error loading invoices', 'error');
        }
      });
  }

  createInvoice(bill: any, action: string): void {
    try {
      this.invoiceService.createInvoice(bill, action);
      this.showNotification(`Invoice ${action} initiated`, 'success');
    } catch (error) {
      console.error('Error creating invoice:', error);
      this.showNotification('Error processing invoice', 'error');
    }
  }

  downloadBill(bill: any): void {
    this.createInvoice(bill, 'download');
  }

  printBill(bill: any): void {
    this.createInvoice(bill, 'print');
  }

  openBill(bill: any): void {
    this.createInvoice(bill, 'open');
  }

  editBill(bill: any): void {
    // TODO: Implement bill editing functionality
    this.showNotification(`Edit functionality for "${bill.billname || bill.invoiceName || 'Untitled Invoice'}" coming soon`, 'info');
  }

  deleteBill(billId: string, billName: string): void {
    const confirmMessage = `Are you sure you want to delete the invoice "${billName}"? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.isLoading = true;
      this.showNotification('Deleting invoice...', 'info');
      
      this.afs.collection('invoices').doc(billId).delete()
        .then(() => {
          this.showNotification(`Invoice "${billName}" deleted successfully`, 'success');
          this.getProjectBills(); // Refresh the list
        })
        .catch((error) => {
          console.error('Error deleting invoice:', error);
          this.showNotification('Error deleting invoice. Please try again.', 'error');
          this.isLoading = false;
        });
    }
  }

  searchBills(): void {
    if (!this.searchTerm.trim() && !this.selectedStatus) {
      this.filteredBills = [...this.bills];
    } else {
      this.filteredBills = this.bills.filter(bill => {
        const searchLower = this.searchTerm.toLowerCase().trim();
        const matchesSearch = !searchLower || 
          bill.billname?.toLowerCase().includes(searchLower) ||
          bill.billnumber?.toLowerCase().includes(searchLower) ||
          bill.invoiceName?.toLowerCase().includes(searchLower) ||
          bill.invoiceNumber?.toLowerCase().includes(searchLower) ||
          bill.customerName?.toLowerCase().includes(searchLower) ||
          bill.customerEmail?.toLowerCase().includes(searchLower) ||
          bill.billtotal?.toString().includes(searchLower) ||
          bill.total?.toString().includes(searchLower) ||
          bill.balencedue?.toString().includes(searchLower) ||
          bill.balanceDue?.toString().includes(searchLower);
        
        const matchesStatus = !this.selectedStatus || bill.status === this.selectedStatus;
        
        return matchesSearch && matchesStatus;
      });
    }
    
    // Show notification for search results
    if (this.searchTerm.trim() || this.selectedStatus) {
      const resultCount = this.filteredBills.length;
      const totalCount = this.bills.length;
      if (resultCount === 0) {
        this.showNotification('No invoices match your search criteria', 'info');
      } else if (resultCount < totalCount) {
        this.showNotification(`Found ${resultCount} of ${totalCount} invoices`, 'success');
      }
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.filteredBills = [...this.bills];
    this.showNotification('All filters cleared successfully', 'success');
  }

  getBillStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      case 'draft': return 'status-draft';
      default: return 'status-default';
    }
  }

  getBillStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'paid': return 'check_circle';
      case 'pending': return 'schedule';
      case 'overdue': return 'warning';
      case 'draft': return 'edit';
      default: return 'receipt';
    }
  }

  getStatusColor(status: string): string {
    const statusOption = this.statusOptions.find(option => option.value === status?.toLowerCase());
    return statusOption?.color || '#6c757d';
  }

  getCreatedDateDisplay(createdAt: any): string {
    if (!createdAt?.seconds) {
      return 'N/A';
    }
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  }

  getDueDateDisplay(dueDate: any): string {
    if (!dueDate?.seconds) {
      return 'N/A';
    }
    const date = new Date(dueDate.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  }

  isOverdue(dueDate: any): boolean {
    if (!dueDate?.seconds) return false;
    const due = new Date(dueDate.seconds * 1000);
    const today = new Date();
    return due < today;
  }

  getDaysUntilDue(dueDate: any): number {
    if (!dueDate?.seconds) return 0;
    const due = new Date(dueDate.seconds * 1000);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  }

  trackByBill(index: number, bill: any): string {
    return bill.id || index;
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const panelClass = type === 'success' ? ['success-snackbar'] : 
                      type === 'error' ? ['error-snackbar'] : ['info-snackbar'];
    
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass
    });
  }

  refreshBills(): void {
    this.showNotification('Refreshing invoices...', 'info');
    this.getProjectBills();
  }
} 