import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { EditTransactionDialogComponent } from './edit-transaction-dialog/edit-transaction-dialog.component';

export interface Transaction {
  id?: string;
  amount: number;
  action: 'IN' | 'OUT';
  type: string;
  date: Date;
  notes?: string;
  expenseof?: string;
  incomeof?: string;
  loanTo?: string;
  loanFrom?: string;
  lendedBy?: string;
  createdAt: Date;
  createdBy?: string;
  createdByName?: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedByName?: string;
  tid?: string;
  loanClear?: boolean;
  originalLendingId?: string;
  AmountReturned?: number;
  amountActual?: number;
}

@Component({
  selector: 'app-tranasctions',
  templateUrl: './tranasctions.component.html',
  styleUrls: ['./tranasctions.component.scss']
})
export class TranasctionsComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  isLoading = false;
  
  // Filter options
  filterText = '';
  filterType = 'all';
  filterAction = 'all';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  
  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalTransactions = 0;
  
  // Summary
  totalIncome = 0;
  totalExpenses = 0;
  netAmount = 0;
  
  private destroy$ = new Subject<void>();

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
   
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTransactions(): void {
    this.isLoading = true;
    
    this.firestore.collection('moneytransactions', ref => 
      ref.orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((transactions: any[]) => {
        this.transactions = transactions;
        this.applyFilters();
        this.calculateSummary();
        this.isLoading = false;
      });
  }

  applyFilters(): void {
    let filtered = [...this.transactions];

    // Text filter
    if (this.filterText) {
      const searchTerm = this.filterText.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.type?.toLowerCase().includes(searchTerm) ||
        transaction.notes?.toLowerCase().includes(searchTerm) ||
        transaction.expenseof?.toLowerCase().includes(searchTerm) ||
        transaction.incomeof?.toLowerCase().includes(searchTerm) ||
        transaction.loanTo?.toLowerCase().includes(searchTerm) ||
        transaction.loanFrom?.toLowerCase().includes(searchTerm) ||
        transaction.tid?.toLowerCase().includes(searchTerm)
      );
    }

    // Type filter
    if (this.filterType !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.type?.toLowerCase() === this.filterType.toLowerCase()
      );
    }

    // Action filter
    if (this.filterAction !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.action === this.filterAction
      );
    }

    // Date range filter
    if (this.dateFrom || this.dateTo) {
      filtered = filtered.filter(transaction => {
        const transactionDate = transaction.date && (transaction.date as any).toDate ? 
          (transaction.date as any).toDate() : new Date(transaction.date);
        
        if (this.dateFrom && transactionDate < this.dateFrom) return false;
        if (this.dateTo && transactionDate > this.dateTo) return false;
        
        return true;
      });
    }

    this.filteredTransactions = filtered;
    this.totalTransactions = filtered.length;
    this.pageIndex = 0; // Reset to first page
  }

  calculateSummary(): void {
    // Exclude RETURN transactions from income as they are not actual income
    this.totalIncome = this.filteredTransactions
      .filter(t => t.action === 'IN' && t.type !== 'RETURN')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Exclude LENDING transactions from expenses as they are not actual expenses
    this.totalExpenses = this.filteredTransactions
      .filter(t => t.action === 'OUT' && t.type !== 'LENDING')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    this.netAmount = this.totalIncome - this.totalExpenses;
  }

  onFilterChange(): void {
    this.applyFilters();
    this.calculateSummary();
  }

  clearFilters(): void {
    this.filterText = '';
    this.filterType = 'all';
    this.filterAction = 'all';
    this.dateFrom = null;
    this.dateTo = null;
    this.onFilterChange();
  }

  getTransactionIcon(transaction: Transaction): string {
    if (transaction.action === 'IN') {
      return 'trending_up';
    } else if (transaction.type === 'LENDING') {
      return 'person_add';
    } else if (transaction.type === 'EXPENSE') {
      return 'shopping_cart';
    } else {
      return 'trending_down';
    }
  }

  getTransactionColor(transaction: Transaction): string {
    if (transaction.action === 'IN') {
      return 'income';
    } else if (transaction.type === 'LENDING') {
      return 'lending';
    } else {
      return 'expense';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getTransactionDate(transaction: Transaction): Date {
    return transaction.date && (transaction.date as any).toDate ? 
      (transaction.date as any).toDate() : new Date(transaction.date);
  }

  editTransaction(transaction: Transaction): void {
    // Open edit dialog
    const dialogRef = this.dialog.open(EditTransactionDialogComponent, {
      width: '600px',
      data: { ...transaction } // Pass a copy of the transaction
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateTransaction(transaction.id!, result);
      }
    });
  }

  private async updateTransaction(transactionId: string, updatedData: any): Promise<void> {
    try {
      this.isLoading = true;

      // Get current user info
      const currentUser = await this.auth.currentUser;
      const currentUserId = currentUser?.uid || localStorage.getItem('userid') || '';
      const currentUserName = localStorage.getItem('username') || 'Unknown User';

      // Prepare update data
      const updateData = {
        ...updatedData,
        updatedAt: new Date(),
        updatedBy: currentUserId,
        updatedByName: currentUserName
      };

      // Update the transaction
      await this.firestore.collection('moneytransactions').doc(transactionId).update(updateData);

      // Log activity
      await this.firestore.collection('activities').add({
        type: 'transaction',
        action: 'Updated',
        entityId: transactionId,
        entityName: updatedData.tid || `${updatedData.type} Transaction`,
        details: `Updated ${updatedData.type} transaction of ${this.formatCurrency(updatedData.amount)}`,
        createdAt: new Date(),
        createdBy: currentUserId,
        createdByName: currentUserName,
        icon: 'edit'
      });

      this.snackBar.open('Transaction updated successfully!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

    } catch (error) {
      console.error('Error updating transaction:', error);
      this.snackBar.open('Error updating transaction. Please try again.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading = false;
    }
  }

  deleteTransaction(transaction: Transaction): void {
    const message = this.getDeleteConfirmationMessage(transaction);
    if (confirm(message)) {
      this.isLoading = true;
      this.performTransactionDeletion(transaction);
    }
  }

  private getDeleteConfirmationMessage(transaction: Transaction): string {
    const baseMessage = `Are you sure you want to delete this ${transaction.type} transaction of ${this.formatCurrency(transaction.amount)}?`;
    
    if (transaction.type === 'LENDING') {
      return `${baseMessage}\n\nWarning: This will also reverse any related return transactions and revert the lending status.`;
    } else if (transaction.type === 'RETURN') {
      return `${baseMessage}\n\nWarning: This will update the original lending transaction to reflect the removed return amount.`;
    }
    
    return baseMessage;
  }

  private async performTransactionDeletion(transaction: Transaction): Promise<void> {
    try {
      // Handle different transaction types with their specific reversal logic
      switch (transaction.type) {
        case 'LENDING':
          await this.deleteLendingTransaction(transaction);
          break;
        case 'RETURN':
          await this.deleteReturnTransaction(transaction);
          break;
        default:
          await this.deleteRegularTransaction(transaction);
          break;
      }

      this.snackBar.open('Transaction deleted successfully and all related actions reversed', 'Close', {
        duration: 4000,
        panelClass: ['success-snackbar']
      });

    } catch (error) {
      console.error('Error deleting transaction:', error);
      this.snackBar.open('Error deleting transaction. Please try again.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading = false;
    }
  }

  private async deleteLendingTransaction(transaction: Transaction): Promise<void> {
    // Find all return transactions linked to this lending
    const returnTransactions = await this.firestore.collection('moneytransactions', ref =>
      ref.where('originalLendingId', '==', transaction.id)
         .where('type', '==', 'RETURN')
    ).get().toPromise();

    const batch = this.firestore.firestore.batch();

    // Delete the main lending transaction
    const lendingRef = this.firestore.collection('moneytransactions').doc(transaction.id).ref;
    batch.delete(lendingRef);

    // Delete all related return transactions
    if (returnTransactions && !returnTransactions.empty) {
      returnTransactions.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // Add activity log for the lending deletion
    const activityRef = this.firestore.collection('activities').doc().ref;
    batch.set(activityRef, {
      type: 'lending',
      action: 'Deleted with Returns',
      entityId: transaction.id,
      entityName: transaction.tid || `Lending to ${transaction.loanTo}`,
      details: `Deleted lending transaction and ${returnTransactions?.size || 0} related return transactions`,
      createdAt: new Date(),
      createdBy: localStorage.getItem('userid') || '',
      createdByName: localStorage.getItem('username') || 'Unknown User',
      icon: 'delete_forever'
    });

    await batch.commit();
  }

  private async deleteReturnTransaction(transaction: Transaction): Promise<void> {
    const batch = this.firestore.firestore.batch();

    // Delete the return transaction
    const returnRef = this.firestore.collection('moneytransactions').doc(transaction.id).ref;
    batch.delete(returnRef);

    // Find and update the original lending transaction
    if ((transaction as any).originalLendingId) {
      const originalLendingRef = this.firestore.collection('moneytransactions').doc((transaction as any).originalLendingId).ref;
      
      // Get the current lending transaction to calculate the reversal
      const originalLending = await this.firestore.collection('moneytransactions').doc((transaction as any).originalLendingId).get().toPromise();
      
      if (originalLending && originalLending.exists) {
        const lendingData = originalLending.data() as any;
        const currentReturnedAmount = lendingData.AmountReturned || 0;
        const newReturnedAmount = Math.max(0, currentReturnedAmount - transaction.amount);
        const newOutstandingAmount = (lendingData.amountActual || lendingData.amount) - newReturnedAmount;
        
        // Update the lending transaction
        batch.update(originalLendingRef, {
          AmountReturned: newReturnedAmount,
          amount: newOutstandingAmount,
          loanClear: false, // Always set to false when reversing a return
          updatedAt: new Date()
        });

        // Add activity log
        const activityRef = this.firestore.collection('activities').doc().ref;
        batch.set(activityRef, {
          type: 'lending',
          action: 'Return Reversed',
          entityId: (transaction as any).originalLendingId,
          entityName: lendingData.tid || `Lending to ${lendingData.lendedBy}`,
          details: `Reversed return of ${this.formatCurrency(transaction.amount)}, outstanding amount updated to ${this.formatCurrency(newOutstandingAmount)}`,
          createdAt: new Date(),
          createdBy: localStorage.getItem('userid') || '',
          createdByName: localStorage.getItem('username') || 'Unknown User',
          icon: 'undo'
        });
      }
    }

    await batch.commit();
  }

  private async deleteRegularTransaction(transaction: Transaction): Promise<void> {
    // Simple deletion for regular transactions (INCOME, EXPENSE, etc.)
    await this.firestore.collection('moneytransactions').doc(transaction.id).delete();

    // Record activity
    await this.firestore.collection('activities').add({
      type: 'transaction',
      action: 'Deleted',
      entityId: transaction.id,
      entityName: transaction.tid || `${transaction.type} Transaction`,
      details: `Deleted ${transaction.type} transaction of ${this.formatCurrency(transaction.amount)}`,
      createdAt: new Date(),
      createdBy: localStorage.getItem('userid') || '',
      createdByName: localStorage.getItem('username') || 'Unknown User',
      icon: 'delete'
    });
  }

  // Pagination methods
  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  getPaginatedTransactions(): Transaction[] {
    const startIndex = this.pageIndex * this.pageSize;
    return this.filteredTransactions.slice(startIndex, startIndex + this.pageSize);
  }

  // Export Functions
  exportToPDF(): void {
    const doc = new jsPDF();
    
    // Company Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Ingle Corp - Financial Transactions Report', 20, 20);
    
    // Report Info
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Total Transactions: ${this.filteredTransactions.length}`, 20, 45);
    doc.text(`Total Income: ${this.formatCurrency(this.totalIncome)}`, 20, 55);
    doc.text(`Total Expenses: ${this.formatCurrency(this.totalExpenses)}`, 20, 65);
    doc.text(`Net Amount: ${this.formatCurrency(this.netAmount)}`, 20, 75);
    
    // Table Headers
    const headers = [
      'Date',
      'Type',
      'Category',
      'Amount',
      'Action',
      'Notes'
    ];
    
    // Table Data
    const data = this.filteredTransactions.map(transaction => [
      this.getTransactionDate(transaction).toLocaleDateString(),
      transaction.type || 'Transaction',
      transaction.expenseof || transaction.incomeof || transaction.loanTo || transaction.loanFrom || '-',
      this.formatCurrency(transaction.amount),
      transaction.action === 'IN' ? 'Income' : 'Expense',
      transaction.notes || '-'
    ]);
    
    // Generate table
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 90,
      theme: 'striped',
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 10,
        cellPadding: 8
      }
    });
    
    // Save PDF
    doc.save(`transactions-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    // Show success message
    this.snackBar.open('PDF exported successfully!', 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  exportToExcel(): void {
    // Prepare data for Excel
    const excelData = this.filteredTransactions.map(transaction => ({
      'Date': this.getTransactionDate(transaction).toLocaleDateString(),
      'Time': this.getTransactionDate(transaction).toLocaleTimeString(),
      'Transaction ID': transaction.tid || 'N/A',
      'Type': transaction.type || 'Transaction',
      'Category': transaction.expenseof || transaction.incomeof || '-',
      'Loan To': transaction.loanTo || '-',
      'Loan From': transaction.loanFrom || '-',
      'Amount': transaction.amount,
      'Action': transaction.action === 'IN' ? 'Income' : 'Expense',
      'Notes': transaction.notes || '-',
      'Created By': transaction.createdByName || '-',
      'Updated By': transaction.updatedByName || '-',
      'Last Updated': transaction.updatedAt ? new Date(transaction.updatedAt).toLocaleDateString() : '-',
      'Loan Cleared': transaction.loanClear ? 'Yes' : 'No'
    }));
    
    // Create summary sheet data
    const summaryData = [
      ['Transaction Summary Report', ''],
      ['Generated on:', new Date().toLocaleDateString()],
      ['Total Transactions:', this.filteredTransactions.length],
      ['Total Income:', this.totalIncome],
      ['Total Expenses:', this.totalExpenses],
      ['Net Amount:', this.netAmount],
      ['', ''],
      ['Filter Applied:', ''],
      ['Text Filter:', this.filterText || 'None'],
      ['Type Filter:', this.filterType === 'all' ? 'All Types' : this.filterType],
      ['Action Filter:', this.filterAction === 'all' ? 'All Actions' : this.filterAction],
      ['Date From:', this.dateFrom ? this.dateFrom.toLocaleDateString() : 'None'],
      ['Date To:', this.dateTo ? this.dateTo.toLocaleDateString() : 'None']
    ];
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add transactions sheet
    const ws1 = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Transactions');
    
    // Add summary sheet
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    
    // Set column widths
    const maxWidth = 25;
    const wscols = [
      { wch: 12 }, // Date
      { wch: 10 }, // Time
      { wch: 15 }, // Transaction ID
      { wch: 15 }, // Type
      { wch: 20 }, // Category
      { wch: 15 }, // Loan To
      { wch: 15 }, // Loan From
      { wch: 12 }, // Amount
      { wch: 10 }, // Action
      { wch: maxWidth }, // Notes
      { wch: 15 }, // Created By
      { wch: 15 }, // Updated By
      { wch: 15 }, // Last Updated
      { wch: 12 }  // Loan Cleared
    ];
    ws1['!cols'] = wscols;
    
    // Generate Excel file
    const fileName = `transactions-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    // Show success message
    this.snackBar.open('Excel file exported successfully!', 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }
}
