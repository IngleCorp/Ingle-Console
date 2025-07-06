import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface Transaction {
  id?: string;
  amount: number;
  action: 'IN' | 'OUT';
  type: string;
  date: Date | any;
  notes?: string;
  expenceof?: string;
  incomeof?: string;
  loanTo?: string;
  loanFrom?: string;
  createdAt: Date;
  createdBy?: string;
  createdByName?: string;
  tid?: string;
}

export interface FinanceStats {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  pendingLendings: number;
  totalLendingAmount: number;
  totalReturnsReceived: number;
  availableBalance: number;
  totalTransactions: number;
}

@Component({
  selector: 'app-finance-dashboard',
  templateUrl: './finance-dashboard.component.html',
  styleUrls: ['./finance-dashboard.component.scss']
})
export class FinanceDashboardComponent implements OnInit, OnDestroy {
  stats: FinanceStats = {
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    pendingLendings: 0,
    totalLendingAmount: 0,
    totalReturnsReceived: 0,
    availableBalance: 0,
    totalTransactions: 0
  };

  recentTransactions: Transaction[] = [];
  isLoading = false;
  
  // Chart data
  monthlyData: any[] = [];
  expenseCategories: any[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth
  ) {}

  ngOnInit(): void {
    this.loadFinanceData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFinanceData(): void {
    this.isLoading = true;
    
    // Load transactions
    this.firestore.collection('moneytransactions', ref => 
      ref.orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((transactions: any[]) => {
        console.log("transactions ### ,",transactions);
        this.calculateStats(transactions);
        this.recentTransactions = transactions.slice(0, 10);
        this.generateChartData(transactions);
        this.isLoading = false;
      });
  }

  calculateStats(transactions: any[]): void {
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Exclude RETURN transactions from income as they are not actual income
    this.stats.totalIncome = transactions
      .filter(t => t.action === 'IN' && t.type !== 'RETURN')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Exclude LENDING transactions from expenses as they are not actual expenses
    this.stats.totalExpenses = transactions
      .filter(t => t.action === 'OUT' && t.type !== 'LENDING')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    this.stats.netIncome = this.stats.totalIncome - this.stats.totalExpenses;

    // Monthly calculations
    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = this.getTransactionDate(t);
      return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
    });

    // Exclude RETURN transactions from monthly income
    this.stats.monthlyIncome = monthlyTransactions
      .filter(t => t.action === 'IN' && t.type !== 'RETURN')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Exclude LENDING transactions from monthly expenses
    this.stats.monthlyExpenses = monthlyTransactions
      .filter(t => t.action === 'OUT' && t.type !== 'LENDING')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    this.stats.pendingLendings = transactions
      .filter(t => t.type === 'LENDING' && !t.loanClear)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate total lending amount (all lending transactions)
    this.stats.totalLendingAmount = transactions
      .filter(t => t.type === 'LENDING')
      .reduce((sum, t) => sum + (t.amountActual || t.amount || 0), 0);

    // Calculate total returns received (all return transactions)
    this.stats.totalReturnsReceived = transactions
      .filter(t => t.type === 'RETURN')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate available balance (net income minus outstanding loans)
    this.stats.availableBalance = this.stats.netIncome - this.stats.pendingLendings;

    this.stats.totalTransactions = transactions.length;
  }

  generateChartData(transactions: any[]): void {
    // Generate monthly data for the last 6 months
    const monthlyData: { [key: string]: { income: number, expenses: number } } = {};
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }

    transactions.forEach(transaction => {
      const transactionDate = this.getTransactionDate(transaction);
      const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        if (transaction.action === 'IN' && transaction.type !== 'RETURN') {
          // Exclude RETURN transactions from income as they are not actual income
          monthlyData[monthKey].income += transaction.amount || 0;
        } else if (transaction.action === 'OUT' && transaction.type !== 'LENDING') {
          // Exclude LENDING transactions from expenses calculation
          monthlyData[monthKey].expenses += transaction.amount || 0;
        }
      }
    });

    this.monthlyData = Object.entries(monthlyData).map(([month, data]) => ({
      month: this.formatMonth(month),
      income: data.income,
      expenses: data.expenses
    }));

    // Generate expense categories (exclude LENDING transactions)
    const categoryData: { [key: string]: number } = {};
    transactions
      .filter(t => t.action === 'OUT' && t.type !== 'LENDING')
      .forEach(transaction => {
        const category = this.getTransactionCategory(transaction) || transaction.type || 'Other';
        categoryData[category] = (categoryData[category] || 0) + (transaction.amount || 0);
      });

    this.expenseCategories = Object.entries(categoryData)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  formatMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }



  // Quick action methods
  getRecentTransactionIcon(transaction: any): string {
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

  getRecentTransactionColor(transaction: any): string {
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
    if (transaction.date && typeof transaction.date.toDate === 'function') {
      return transaction.date.toDate();
    }
    return new Date(transaction.date);
  }

  getTransactionCategory(transaction: Transaction): string {
    return transaction.expenceof || transaction.incomeof || '';
  }

  // Method to determine responsive font size class based on amount
  getAmountSizeClass(amount: number): string {
    const absAmount = Math.abs(amount);
    
    /*
    Responsive Amount Size Classes:
    - small-amount: ₹1 - ₹99,999 (font-size: 2.05rem)
    - medium-amount: ₹1,00,000 - ₹99,99,999 (font-size: 1.75rem)
    - large-amount: ₹1,00,00,000 - ₹99,99,99,999 (font-size: 1.5rem)
    - extra-large-amount: ₹1,00,00,00,000+ (font-size: 1.25rem)
    */
    
    if (absAmount < 100000) { // Less than ₹1 lakh
      return 'small-amount';
    } else if (absAmount < 10000000) { // Less than ₹1 crore
      return 'medium-amount';
    } else if (absAmount < 1000000000) { // Less than ₹100 crores
      return 'large-amount';
    } else { // ₹100 crores and above
      return 'extra-large-amount';
    }
  }
} 