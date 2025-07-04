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
}

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss'
})
export class InvoiceComponent implements OnInit {
  invoices: Invoice[] = [];
  pdfInvoice: Invoice | null = null;
  @ViewChild('pdfInvoiceTemplate') pdfInvoiceTemplate!: ElementRef;

  constructor(
    private dialog: MatDialog, 
    private afs: AngularFirestore, 
    private auth: AngularFireAuth, 
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.afs.collection<Invoice>('invoices').valueChanges({ idField: 'id' }).subscribe((invoices) => {
      this.invoices = invoices;
    });
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
    if (invoice.status) {
      return invoice.status;
    }
    
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    
    if (dueDate < today) {
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
        const user = await this.auth.currentUser;
        
        if (invoice.id) {
          // Delete from Firestore if it has an ID
          this.afs.collection('invoices').doc(invoice.id).delete().then(async () => {
            // Create activity record for deletion
            if (user) {
              await this.afs.collection('activities').add({
                type: 'invoice',
                action: 'Deleted',
                entityId: invoice.id,
                entityName: invoice.invoiceNumber,
                details: `Invoice ${invoice.invoiceNumber} deleted for ${invoice.billTo.company}`,
                createdAt: new Date(),
                createdBy: user.uid,
                createdByName: user.displayName || user.email || 'Unknown User',
                icon: 'delete'
              });
            }
            
            this.snackBar.open('Invoice deleted successfully', 'Close', { 
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
          }).catch((error) => {
            console.error('Error deleting invoice:', error);
            this.snackBar.open('Failed to delete invoice', 'Close', { 
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
          });
        } else {
          // Remove from local array if no ID (for demo purposes)
          this.invoices.splice(index, 1);
          this.snackBar.open('Invoice deleted successfully', 'Close', { 
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        }
      }
    });
  }
}
