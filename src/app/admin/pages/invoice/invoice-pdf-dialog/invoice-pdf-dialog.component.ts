import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Invoice } from '../invoice.component';

@Component({
  selector: 'app-invoice-pdf-dialog',
  templateUrl: './invoice-pdf-dialog.component.html',
  styleUrls: ['./invoice-pdf-dialog.component.scss']
})
export class InvoicePdfDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<InvoicePdfDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { invoice: Invoice }
  ) {
    console.log('Dialog data:', data);
  }

  get invoice() {
    return this.data.invoice;
  }

  getSubtotal() {
    return this.invoice.items?.reduce((sum, item) => sum + (item.qty * item.rate), 0) || 0;
  }
  getIGST() {
    return this.invoice.items?.reduce((sum, item) => sum + (item.qty * item.rate) * (item.igst/100), 0) || 0;
  }
} 