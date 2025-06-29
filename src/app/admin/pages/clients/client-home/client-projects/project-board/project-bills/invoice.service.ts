import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {

  constructor(private snackBar: MatSnackBar) { }

  createInvoice(bill: any, action: string): void {
    // This is a placeholder implementation
    // In a real application, you would integrate with a PDF generation library
    // like jsPDF, pdfmake, or a backend service
    
    console.log('Creating invoice for bill:', bill);
    console.log('Action:', action);
    
    switch (action) {
      case 'download':
        this.downloadInvoice(bill);
        break;
      case 'print':
        this.printInvoice(bill);
        break;
      case 'open':
        this.openInvoice(bill);
        break;
      default:
        this.showNotification(`Invoice action '${action}' not implemented yet`, 'info');
    }
  }

  private downloadInvoice(bill: any): void {
    // Placeholder for download functionality
    this.showNotification(`Downloading invoice for ${bill.billname}`, 'success');
    
    // In a real implementation, you would:
    // 1. Generate PDF using a library like jsPDF or pdfmake
    // 2. Create a blob and download it
    // 3. Or send to backend for PDF generation
  }

  private printInvoice(bill: any): void {
    // Placeholder for print functionality
    this.showNotification(`Printing invoice for ${bill.billname}`, 'success');
    
    // In a real implementation, you would:
    // 1. Generate PDF or HTML
    // 2. Open print dialog
    // 3. Or send to printer service
  }

  private openInvoice(bill: any): void {
    // Placeholder for open functionality
    this.showNotification(`Opening invoice for ${bill.billname}`, 'success');
    
    // In a real implementation, you would:
    // 1. Open in new tab/window
    // 2. Or open in modal dialog
    // 3. Or navigate to invoice viewer
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : 
                  type === 'error' ? ['error-snackbar'] : ['info-snackbar']
    });
  }

  // Helper method to format invoice data
  formatInvoiceData(bill: any): any {
    return {
      billNumber: bill.billnumber,
      billName: bill.billname,
      customerName: bill.customerName,
      customerEmail: bill.email,
      customerPhone: bill.contactNo,
      customerAddress: bill.address,
      billDate: bill.billdate,
      dueDate: bill.dueDate,
      items: bill.products || [],
      subtotal: this.calculateSubtotal(bill.products),
      tax: bill.tax || 0,
      total: bill.billtotal,
      balanceDue: bill.balencedue,
      additionalDetails: bill.additionalDetails || '',
      status: bill.status || 'draft'
    };
  }

  private calculateSubtotal(products: any[]): number {
    if (!products || !Array.isArray(products)) return 0;
    return products.reduce((sum, product) => {
      return sum + (product.price * product.qty);
    }, 0);
  }
} 