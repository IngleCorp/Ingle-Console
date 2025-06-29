import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InvoiceService } from './invoice.service';

@Component({
  selector: 'app-project-bills',
  templateUrl: './project-bills.component.html',
  styleUrls: ['./project-bills.component.scss']
})
export class ProjectBillsComponent implements OnInit {
  projectId: string | null = null;
  bills: any[] = [];
  filteredBills: any[] = [];
  isLoading: boolean = false;
  searchTerm: string = '';
  selectedStatus: string = '';

  // Bill status options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'draft', label: 'Draft' }
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
    this.getProjectBills();
  }

  getProjectBills(): void {
    if (!this.projectId) return;
    
    this.isLoading = true;
    this.afs.collection('bills', ref => ref.where('projectid', '==', this.projectId))
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          console.log('Project bills:', data);
          this.bills = data || [];
          this.filteredBills = [...this.bills];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching bills:', error);
          this.isLoading = false;
          this.showNotification('Error loading bills', 'error');
        }
      });
  }

  createInvoice(bill: any, action: string): void {
    this.invoiceService.createInvoice(bill, action);
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
    this.showNotification('Edit bill functionality coming soon', 'success');
  }

  deleteBill(billId: string, billName: string): void {
    if (confirm(`Are you sure you want to delete the bill "${billName}"?`)) {
      this.afs.collection('bills').doc(billId).delete()
        .then(() => {
          this.showNotification('Bill deleted successfully', 'success');
          this.getProjectBills();
        })
        .catch((error) => {
          console.error('Error deleting bill:', error);
          this.showNotification('Error deleting bill', 'error');
        });
    }
  }

  searchBills(): void {
    if (!this.searchTerm.trim() && !this.selectedStatus) {
      this.filteredBills = [...this.bills];
    } else {
      this.filteredBills = this.bills.filter(bill => {
        const matchesSearch = !this.searchTerm.trim() || 
          bill.billname?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          bill.billnumber?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          bill.customerName?.toLowerCase().includes(this.searchTerm.toLowerCase());
        
        const matchesStatus = !this.selectedStatus || bill.status === this.selectedStatus;
        
        return matchesSearch && matchesStatus;
      });
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.filteredBills = [...this.bills];
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

  trackByBill(index: number, bill: any): string {
    return bill.id;
  }
} 