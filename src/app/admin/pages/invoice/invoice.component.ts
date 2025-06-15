import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { InvoiceFormComponent } from './invoice-form/invoice-form.component';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AngularFirestore } from '@angular/fire/compat/firestore';
// import jsPDF from 'jspdf'; // Uncomment when jsPDF is installed

export interface Invoice {
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

  constructor(private dialog: MatDialog, private afs: AngularFirestore) {}

  ngOnInit() {
    this.afs.collection<Invoice>('invoices').valueChanges({ idField: 'id' }).subscribe((invoices) => {
      this.invoices = invoices;
    });
  }

  openForm(invoice: Invoice | null = null, index: number | null = null) {
    const dialogRef = this.dialog.open(InvoiceFormComponent, {
      width: '800px',
      data: { invoice }
    });
    dialogRef.afterClosed().subscribe((result: Invoice | undefined) => {
      if (result) {
        
      }
    });
  }

  async exportToPDF(invoice: Invoice) {
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
}
