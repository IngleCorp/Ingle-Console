import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { InvoiceFormComponent } from './invoice-form/invoice-form.component';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { InvoicePdfDialogComponent } from './invoice-pdf-dialog/invoice-pdf-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDeleteDialogComponent } from './confirm-delete-dialog/confirm-delete-dialog.component';
import { CategorySelectionDialogComponent } from './category-selection-dialog/category-selection-dialog.component';
// import jsPDF from 'jspdf'; // Uncomment when jsPDF is installed

export interface Invoice {
  id?: string;
  company: {
    name: string;
    gstin: string;
    address: string;
  };
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  terms: string;
  placeOfSupply: string;
  billTo: {
    company: string;
    address: string;
    gstin: string;
  };
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  subject: string;
  items: Array<{
    description: string;
    hsn: string;
    qty: number;
    rate: number;
    per: string;
    igst: number;
  }>;
  notes: string;
  paymentOptions: string;
  total: number;
  signature?: string;
  status?: 'pending' | 'paid' | 'overdue';
  paymentStatus?: 'paid' | 'unpaid';
  transactionId?: string;
  
  // Payment tracking fields
  paidAt?: Date;
  paidBy?: string;
  paidByName?: string;
  paymentCategory?: string;
  unpaidAt?: Date;
  unpaidBy?: string;
  unpaidByName?: string;
  
  // General tracking fields
  createdAt?: Date;
  createdBy?: string;
  createdByName?: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedByName?: string;
}

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss'
})
export class InvoiceComponent implements OnInit {
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  pdfInvoice: Invoice | null = null;
  @ViewChild('pdfInvoiceTemplate') pdfInvoiceTemplate!: ElementRef;

  // Filter properties
  searchTerm: string = '';
  statusFilter: string = 'all';
  dateRangeFilter: string = 'all';
  paymentStatusFilter: string = 'all';
  showFilters: boolean = false;

  constructor(
    private dialog: MatDialog, 
    private afs: AngularFirestore, 
    private auth: AngularFireAuth, 
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.afs.collection<Invoice>('invoices').valueChanges({ idField: 'id' }).subscribe((invoices) => {
      this.invoices = invoices;
      this.filteredInvoices = [...invoices];
      this.applyFilters();
    });
  }

  // Filter methods
  applyFilters() {
    this.filteredInvoices = this.invoices.filter(invoice => {
      // Search filter
      const matchesSearch = !this.searchTerm || 
        invoice.invoiceNumber?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        invoice.billTo?.company?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        invoice.clientName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        invoice.projectName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        invoice.subject?.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Status filter
      const invoiceStatus = this.getInvoiceStatus(invoice);
      const matchesStatus = this.statusFilter === 'all' || invoiceStatus === this.statusFilter;

      // Payment status filter
      const paymentStatus = invoice.paymentStatus || 'unpaid';
      const matchesPaymentStatus = this.paymentStatusFilter === 'all' || paymentStatus === this.paymentStatusFilter;

      // Date range filter
      const matchesDateRange = this.matchesDateRange(invoice);

      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesDateRange;
    });
  }

  matchesDateRange(invoice: Invoice): boolean {
    if (this.dateRangeFilter === 'all') return true;

    const invoiceDate = new Date(invoice.invoiceDate);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (this.dateRangeFilter) {
      case 'today':
        return invoiceDate >= startOfToday;
      case 'this-week':
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        return invoiceDate >= weekAgo;
      case 'this-month':
        const monthAgo = new Date();
        monthAgo.setMonth(today.getMonth() - 1);
        return invoiceDate >= monthAgo;
      case 'this-year':
        const yearAgo = new Date();
        yearAgo.setFullYear(today.getFullYear() - 1);
        return invoiceDate >= yearAgo;
      default:
        return true;
    }
  }

  onSearchChange() {
    this.applyFilters();
  }

  onStatusFilterChange() {
    this.applyFilters();
  }

  onPaymentStatusFilterChange() {
    this.applyFilters();
  }

  onDateRangeFilterChange() {
    this.applyFilters();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.dateRangeFilter = 'all';
    this.paymentStatusFilter = 'all';
    this.applyFilters();
  }

  // Updated statistics methods to use filtered data
  getFilteredInvoicesCount(): number {
    return this.filteredInvoices.length;
  }

  getFilteredPendingInvoices(): number {
    return this.filteredInvoices.filter(invoice => this.getInvoiceStatus(invoice) === 'pending').length;
  }

  getFilteredPaidInvoices(): number {
    return this.filteredInvoices.filter(invoice => this.getInvoiceStatus(invoice) === 'paid').length;
  }

  getFilteredTotalRevenue(): number {
    return this.filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  }

  openForm(invoice: Invoice | null = null, index: number | null = null) {
    const dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: { invoice }
    });
    dialogRef.afterClosed().subscribe((result: Invoice | undefined) => {
      if (result) {
        
      }
    });
  }

  async exportToPDF(invoice: Invoice) {
    console.log('Exporting invoice:', invoice);
    this.pdfInvoice = invoice;
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for template to render
    const element = this.pdfInvoiceTemplate.nativeElement;
    html2canvas(element, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
      this.pdfInvoice = null;
    });
  }

  viewInvoicePDF(invoice: Invoice) {
    console.log('Opening dialog', invoice);
    this.dialog.open(InvoicePdfDialogComponent, {
      width: '850px',
      data: { invoice }
    });
  }

  // Payment Status Management
  async updatePaymentStatus(invoice: Invoice, status: 'paid' | 'unpaid', category: string = 'Service Revenue') {
    if (!invoice.id) {
      this.snackBar.open('Cannot update payment status for invoice without ID', 'Close', { 
        duration: 3000 
      });
      return;
    }

    try {
      const user = await this.auth.currentUser;
      
      if (!user) {
        this.snackBar.open('User not authenticated', 'Close', { 
          duration: 3000 
        });
        return;
      }

      const currentTime = new Date();
      const userInfo = {
        updatedAt: currentTime,
        updatedBy: user.uid,
        updatedByName: user.displayName || user.email || 'Unknown User'
      };
      
      if (status === 'paid' && invoice.paymentStatus !== 'paid') {
        // Create transaction in finance module's moneytransactions collection
        const transactionData = {
          amount: invoice.total,
          action: 'IN',
          type: 'INCOME',
          incomeof: category,
          date: currentTime,
          notes: `Payment received for Invoice ${invoice.invoiceNumber} - ${invoice.billTo.company}`,
          tid: `INV-${invoice.invoiceNumber}-${currentTime.getTime()}`,
          createdAt: currentTime,
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Unknown User',
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber
        };

        // Create the transaction first
        const transactionRef = await this.afs.collection('moneytransactions').add(transactionData);
        
        // Update invoice with payment status, transaction ID, and user info
        await this.afs.collection('invoices').doc(invoice.id).update({
          paymentStatus: 'paid',
          transactionId: transactionRef.id,
          paidAt: currentTime,
          paidBy: user.uid,
          paidByName: user.displayName || user.email || 'Unknown User',
          paymentCategory: category,
          ...userInfo
        });

        // Create activity record
        await this.afs.collection('activities').add({
          type: 'invoice',
          action: 'Payment Received',
          entityId: invoice.id,
          entityName: invoice.invoiceNumber,
          details: `Payment of ₹${invoice.total.toLocaleString()} received for Invoice ${invoice.invoiceNumber} in category "${category}"`,
          createdAt: currentTime,
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Unknown User',
          icon: 'payment'
        });

        this.snackBar.open(`Invoice marked as paid by ${user.displayName || user.email || 'You'} and transaction created in finance module`, 'Close', { 
          duration: 4000 
        });

      } else if (status === 'unpaid' && invoice.paymentStatus === 'paid') {
        // Remove transaction from finance module's moneytransactions collection
        if (invoice.transactionId) {
          await this.afs.collection('moneytransactions').doc(invoice.transactionId).delete();
        }

        // Update invoice with cleared payment fields and user info
        await this.afs.collection('invoices').doc(invoice.id).update({
          paymentStatus: 'unpaid',
          transactionId: null,
          paidAt: null,
          paidBy: null,
          paidByName: null,
          paymentCategory: null,
          unpaidAt: currentTime,
          unpaidBy: user.uid,
          unpaidByName: user.displayName || user.email || 'Unknown User',
          ...userInfo
        });

        // Create activity record
        await this.afs.collection('activities').add({
          type: 'invoice',
          action: 'Payment Status Updated',
          entityId: invoice.id,
          entityName: invoice.invoiceNumber,
          details: `Invoice ${invoice.invoiceNumber} marked as unpaid by ${user.displayName || user.email || 'User'}`,
          createdAt: currentTime,
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Unknown User',
          icon: 'money_off'
        });

        this.snackBar.open(`Invoice marked as unpaid by ${user.displayName || user.email || 'You'} and transaction removed from finance module`, 'Close', { 
          duration: 4000 
        });
      }

    } catch (error) {
      console.error('Error updating payment status:', error);
      this.snackBar.open('Failed to update payment status', 'Close', { 
        duration: 3000 
      });
    }
  }

  // Show category selection dialog
  async markAsPaid(invoice: Invoice) {
    const dialogRef = this.dialog.open(CategorySelectionDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      data: { 
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total
      }
    });

    dialogRef.afterClosed().subscribe(async (selectedCategory: string) => {
      if (selectedCategory) {
        await this.updatePaymentStatus(invoice, 'paid', selectedCategory);
      }
    });
  }

  // Mark invoice as unpaid
  async markAsUnpaid(invoice: Invoice) {
    await this.updatePaymentStatus(invoice, 'unpaid');
  }

  // Helper method to get invoice number for display
  getDisplayInvoiceNumber(invoice: Invoice): string {
    return invoice.invoiceNumber || 'Unknown';
  }

  // Statistics Methods
  getPendingInvoices(): number {
    return this.invoices.filter(invoice => this.getInvoiceStatus(invoice) === 'pending').length;
  }

  getPaidInvoices(): number {
    return this.invoices.filter(invoice => this.getInvoiceStatus(invoice) === 'paid').length;
  }

  getTotalRevenue(): number {
    return this.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  }

  // Status Methods
  getInvoiceStatus(invoice: Invoice): 'pending' | 'paid' | 'overdue' {
    // Check payment status first
    if (invoice.paymentStatus === 'paid') {
      return 'paid';
    }
    
    if (invoice.status) {
      return invoice.status;
    }
    
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    
    if (dueDate < today && (!invoice.paymentStatus || invoice.paymentStatus === 'unpaid')) {
      return 'overdue';
    }
    
    return 'pending';
  }

  getInvoiceStatusText(invoice: Invoice): string {
    const status = this.getInvoiceStatus(invoice);
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'overdue':
        return 'Overdue';
      case 'pending':
      default:
        return 'Pending';
    }
  }

  getBillToCompany(invoice: Invoice) {
    return invoice.billTo?.company || '';
  }
  getBillToAddress(invoice: Invoice) {
    return invoice.billTo?.address || '';
  }
  getBillToGSTIN(invoice: Invoice) {
    return invoice.billTo?.gstin || '';
  }
  getSubtotal(invoice: Invoice) {
    return invoice.items?.reduce((sum, item) => sum + (item.qty * item.rate), 0) || 0;
  }
  getIGST(invoice: Invoice) {
    return invoice.items?.reduce((sum, item) => sum + (item.qty * item.rate) * (item.igst/100), 0) || 0;
  }

  async deleteInvoice(invoice: Invoice, index: number) {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: { 
        title: 'Delete Invoice',
        message: `Are you sure you want to delete invoice "${invoice.invoiceNumber}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(async (result: boolean) => {
      if (result) {
        try {
          const user = await this.auth.currentUser;
          
          if (!user) {
            this.snackBar.open('User not authenticated', 'Close', { 
              duration: 3000 
            });
            return;
          }

          const currentTime = new Date();

          if (invoice.id) {
            // Delete associated transaction if it exists
            if (invoice.transactionId) {
              await this.afs.collection('moneytransactions').doc(invoice.transactionId).delete();
              console.log('Associated transaction deleted:', invoice.transactionId);
            }

            // Delete the invoice from Firestore
            await this.afs.collection('invoices').doc(invoice.id).delete();
            
            // Create activity record for deletion
            await this.afs.collection('activities').add({
              type: 'invoice',
              action: 'Deleted',
              entityId: invoice.id,
              entityName: invoice.invoiceNumber,
              details: `Invoice ${invoice.invoiceNumber} deleted by ${user.displayName || user.email || 'User'} for ${invoice.billTo.company}${invoice.transactionId ? ' (associated transaction also removed)' : ''}`,
              createdAt: currentTime,
              createdBy: user.uid,
              createdByName: user.displayName || user.email || 'Unknown User',
              icon: 'delete'
            });
            
            this.snackBar.open(`Invoice deleted successfully by ${user.displayName || user.email || 'You'}`, 'Close', { 
              duration: 4000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
          } else {
            // Remove from local array if no ID (for demo purposes)
            this.invoices.splice(index, 1);
            this.applyFilters(); // Re-apply filters after deletion
            this.snackBar.open('Invoice deleted successfully', 'Close', { 
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
          }
        } catch (error) {
          console.error('Error deleting invoice:', error);
          this.snackBar.open('Failed to delete invoice', 'Close', { 
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        }
      }
    });
  }
}
