import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GeneralService } from '../../../../core/services/general.service';
import { Subscription } from 'rxjs';

// Interface for lending transaction
interface LendingTransaction {
  id: string;
  amount: number;
  lendedBy: string;
  createdAt: any;
  date: any;
  notes: string;
  loanClear: boolean;
  tid: string;
  createdBy: string;
  createdByName: string;
  amountActual?: number;
  AmountReturned?: number;
}

// Interface for return dialog data
interface ReturnDialogData {
  lending: LendingTransaction;
}

@Component({
  selector: 'app-employee-lending',
  templateUrl: './employee-lending.component.html',
  styleUrls: ['./employee-lending.component.scss']
})
export class EmployeeLendingComponent implements OnInit, OnDestroy {
  // Data properties
  lendingTransactions: LendingTransaction[] = [];
  filteredTransactions: LendingTransaction[] = [];
  activeTransactions: LendingTransaction[] = [];
  completedTransactions: LendingTransaction[] = [];
  
  // Loading and UI states
  loading = false;
  searchTerm = '';
  selectedTab = 'active'; // active, completed, all
  
  // Statistics
  totalLent = 0;
  totalOutstanding = 0;
  totalReturned = 0;
  activeCount = 0;
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  constructor(
    private afs: AngularFirestore,
    private dialog: MatDialog,
    private generalService: GeneralService
  ) {}

  ngOnInit(): void {
    this.loadLendingTransactions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Load all lending transactions
  loadLendingTransactions(): void {
    this.loading = true;
    
    const sub = this.afs.collection('moneytransactions', ref => 
      ref.where('type', '==', 'LENDING')
         .orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' }).subscribe(
      (transactions: any[]) => {
        console.log("transactions ### ,",transactions);
        this.lendingTransactions = transactions;
        this.processTransactions();
        this.calculateStatistics();
        this.filterTransactions();
        this.loading = false;
      },
      (error) => {
        console.error('Error loading lending transactions:', error);
        this.generalService.openSnackBar('Error loading lending data', 'Close');
        this.loading = false;
      }
    );
    
    this.subscriptions.push(sub);
  }

  // Process transactions and categorize them
  processTransactions(): void {
    this.activeTransactions = this.lendingTransactions.filter(t => !t.loanClear);
    this.completedTransactions = this.lendingTransactions.filter(t => t.loanClear);
  }

  // Calculate statistics
  calculateStatistics(): void {
    this.totalLent = this.lendingTransactions.reduce((sum, t) => sum + (t.amountActual || t.amount), 0);
    this.totalOutstanding = this.activeTransactions.reduce((sum, t) => sum + t.amount, 0);
    this.totalReturned = this.completedTransactions.reduce((sum, t) => sum + (t.AmountReturned || t.amount), 0);
    this.activeCount = this.activeTransactions.length;
  }

  // Filter transactions based on search and tab
  filterTransactions(): void {
    let transactions: LendingTransaction[] = [];
    
    switch (this.selectedTab) {
      case 'active':
        transactions = this.activeTransactions;
        break;
      case 'completed':
        transactions = this.completedTransactions;
        break;
      case 'all':
        transactions = this.lendingTransactions;
        break;
    }
    
    if (this.searchTerm) {
      transactions = transactions.filter(t => 
        t.lendedBy.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.notes.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.tid.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    this.filteredTransactions = transactions;
  }

  // Handle search input
  onSearchChange(): void {
    this.filterTransactions();
  }

  // Handle tab change
  onTabChange(tab: string): void {
    this.selectedTab = tab;
    this.filterTransactions();
  }

  // Format currency
  formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Get formatted date
  getFormattedDate(date: any): string {
    if (!date) return '';
    
    let dateObj: Date;
    if (date.toDate) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    return dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // Get days since lending
  getDaysSince(date: any): number {
    if (!date) return 0;
    
    let dateObj: Date;
    if (date.toDate) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Get urgency level based on days
  getUrgencyLevel(days: number): string {
    if (days <= 7) return 'recent';
    if (days <= 30) return 'medium';
    return 'urgent';
  }

  // Open return dialog
  openReturnDialog(lending: LendingTransaction): void {
    const dialogRef = this.dialog.open(ReturnLendingDialogComponent, {
      width: '500px',
      data: { lending }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.processReturn(lending, result.amount, result.notes);
      }
    });
  }

  // Process return of lending
  processReturn(lending: LendingTransaction, returnAmount: number, notes: string): void {
    this.loading = true;
    
    const isFullReturn = returnAmount >= lending.amount;
    const remainingAmount = lending.amount - returnAmount;
    
    const updateData: any = {
      loanClear: isFullReturn,
      updatedAt: new Date(),
      AmountReturned: (lending.AmountReturned || 0) + returnAmount,
      returnNotes: notes
    };
    
    if (!isFullReturn) {
      updateData.amount = remainingAmount;
      updateData.amountActual = lending.amountActual || lending.amount;
    }
    
    this.afs.collection('moneytransactions').doc(lending.id).update(updateData).then(() => {
      // Create return transaction record
      const returnTransaction = {
        amount: returnAmount,
        action: 'IN',
        date: new Date(),
        type: 'RETURN',
        lendedBy: lending.lendedBy,
        notes: `Return from ${lending.lendedBy} - ${notes}`,
        tid: 'RTN-' + new Date().getTime(),
        createdAt: new Date(),
        createdBy: localStorage.getItem('userid') || '',
        createdByName: localStorage.getItem('username') || 'Unknown User',
        originalLendingId: lending.id
      };
      
      this.afs.collection('moneytransactions').add(returnTransaction).then(() => {
        // Record activity
        this.afs.collection('activities').add({
          type: 'lending',
          action: isFullReturn ? 'Cleared' : 'Partially Returned',
          entityId: lending.id,
          entityName: lending.lendedBy,
          details: `${this.formatCurrency(returnAmount)} returned by ${lending.lendedBy}`,
          createdAt: new Date(),
          createdBy: localStorage.getItem('userid') || '',
          createdByName: localStorage.getItem('username') || 'Unknown User',
          icon: 'assignment_return'
        });
        
        this.generalService.openSnackBar(
          `${this.formatCurrency(returnAmount)} returned successfully`, 
          'Close'
        );
        this.loading = false;
      }).catch(error => {
        console.error('Error creating return transaction:', error);
        this.generalService.openSnackBar('Error processing return', 'Close');
        this.loading = false;
      });
    }).catch(error => {
      console.error('Error updating lending:', error);
      this.generalService.openSnackBar('Error processing return', 'Close');
      this.loading = false;
    });
  }

  // Mark as fully paid
  markAsFullyPaid(lending: LendingTransaction): void {
    this.processReturn(lending, lending.amount, 'Marked as fully paid');
  }

  // Delete lending transaction with full reversal
  deleteLendingTransaction(lending: LendingTransaction): void {
    const message = `Are you sure you want to delete this lending transaction of ${this.formatCurrency(lending.amount)} to ${lending.lendedBy}?\n\nWarning: This will also reverse any related return transactions and remove all associated records.`;
    
    if (confirm(message)) {
      this.performLendingDeletion(lending);
    }
  }

  private async performLendingDeletion(lending: LendingTransaction): Promise<void> {
    this.loading = true;
    
    try {
      // Find all return transactions linked to this lending
      const returnTransactions = await this.afs.collection('moneytransactions', ref =>
        ref.where('originalLendingId', '==', lending.id)
           .where('type', '==', 'RETURN')
      ).get().toPromise();

      const batch = this.afs.firestore.batch();

      // Delete the main lending transaction
      const lendingRef = this.afs.collection('moneytransactions').doc(lending.id).ref;
      batch.delete(lendingRef);

      // Delete all related return transactions
      if (returnTransactions && !returnTransactions.empty) {
        returnTransactions.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add comprehensive activity log
      const activityRef = this.afs.collection('activities').doc().ref;
      batch.set(activityRef, {
        type: 'lending',
        action: 'Deleted with Returns',
        entityId: lending.id,
        entityName: lending.tid || `Lending to ${lending.lendedBy}`,
        details: `Deleted lending transaction to ${lending.lendedBy} (${this.formatCurrency(lending.amount)}) and ${returnTransactions?.size || 0} related return transactions`,
        createdAt: new Date(),
        createdBy: localStorage.getItem('userid') || '',
        createdByName: localStorage.getItem('username') || 'Unknown User',
        icon: 'delete_forever'
      });

      await batch.commit();

      this.generalService.openSnackBar(
        `Lending transaction deleted successfully. All related returns have been reversed.`, 
        'Close'
      );

    } catch (error) {
      console.error('Error deleting lending transaction:', error);
      this.generalService.openSnackBar('Error deleting transaction. Please try again.', 'Close');
    } finally {
      this.loading = false;
    }
  }
}

// Return Dialog Component
@Component({
  selector: 'app-return-lending-dialog',
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon>assignment_return</mat-icon>
          Return Lending
        </h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div mat-dialog-content class="dialog-content">
        <div class="lending-info">
          <h3>{{ data.lending.lendedBy }}</h3>
          <p class="amount">Outstanding: {{ formatCurrency(data.lending.amount) }}</p>
          <p class="date">Lent on: {{ getFormattedDate(data.lending.date) }}</p>
        </div>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Return Amount</mat-label>
          <input matInput 
                 type="number" 
                 [(ngModel)]="returnAmount" 
                 [max]="data.lending.amount"
                 min="0.01"
                 step="0.01"
                 placeholder="Enter amount">
          <span matPrefix>₹&nbsp;</span>
          <mat-icon matSuffix>currency_rupee</mat-icon>
          <mat-hint>Maximum: {{ formatCurrency(data.lending.amount) }}</mat-hint>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes (Optional)</mat-label>
          <textarea matInput 
                    [(ngModel)]="returnNotes" 
                    placeholder="Add any notes about this return"
                    rows="3"></textarea>
          <mat-icon matSuffix>note</mat-icon>
        </mat-form-field>
        
        <div class="quick-amounts">
          <p>Quick amounts:</p>
          <div class="amount-buttons">
            <button mat-stroked-button 
                    (click)="returnAmount = data.lending.amount / 2"
                    [disabled]="data.lending.amount < 2">
              Half ({{ formatCurrency(data.lending.amount / 2) }})
            </button>
            <button mat-stroked-button 
                    (click)="returnAmount = data.lending.amount">
              Full ({{ formatCurrency(data.lending.amount) }})
            </button>
          </div>
        </div>
      </div>
      
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button 
                color="primary" 
                [disabled]="!returnAmount || returnAmount <= 0 || returnAmount > data.lending.amount"
                (click)="processReturn()">
          <mat-icon>save</mat-icon>
          Process Return
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      width: 100%;
      max-width: 500px;
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .dialog-header h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      color: #2c3e50;
    }
    
    .dialog-content {
      padding: 0 24px;
    }
    
    .lending-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #3498db;
    }
    
    .lending-info h3 {
      margin: 0 0 10px 0;
      color: #2c3e50;
    }
    
    .lending-info .amount {
      font-size: 18px;
      font-weight: 600;
      color: #e74c3c;
      margin: 5px 0;
    }
    
    .lending-info .date {
      color: #6c757d;
      font-size: 14px;
      margin: 5px 0;
    }
    
    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }
    
    .quick-amounts {
      margin-bottom: 20px;
    }
    
    .quick-amounts p {
      margin: 0 0 10px 0;
      color: #6c757d;
      font-size: 14px;
    }
    
    .amount-buttons {
      display: flex;
      gap: 10px;
    }
    
    .amount-buttons button {
      flex: 1;
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 20px 24px;
    }
    
    .dialog-actions button {
      display: flex;
      align-items: center;
      gap: 5px;
    }
  `]
})
export class ReturnLendingDialogComponent {
  returnAmount: number = 0;
  returnNotes: string = '';

  constructor(
    public dialogRef: MatDialogRef<ReturnLendingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReturnDialogData
  ) {}

  formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  getFormattedDate(date: any): string {
    if (!date) return '';
    
    let dateObj: Date;
    if (date.toDate) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    return dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  processReturn(): void {
    if (this.returnAmount > 0 && this.returnAmount <= this.data.lending.amount) {
      this.dialogRef.close({
        amount: this.returnAmount,
        notes: this.returnNotes
      });
    }
  }
} 