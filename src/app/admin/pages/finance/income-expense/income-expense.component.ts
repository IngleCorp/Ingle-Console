import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Chart, { ChartConfiguration, ChartType } from 'chart.js/auto';

export interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
  transactions: number;
  color?: string;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface FinancialInsight {
  type: 'warning' | 'success' | 'info' | 'danger';
  title: string;
  message: string;
  value?: number;
  trend?: string;
}

@Component({
  selector: 'app-income-expense',
  templateUrl: './income-expense.component.html',
  styleUrls: ['./income-expense.component.scss']
})
export class IncomeExpenseComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('monthlyChart', { static: false }) monthlyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart', { static: false }) categoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseCategoryChart', { static: false }) expenseCategoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChart', { static: false }) trendChartRef!: ElementRef<HTMLCanvasElement>;

  // Data arrays
  incomeData: any[] = [];
  expenseData: any[] = [];
  monthlyTrends: MonthlyTrend[] = [];
  incomeCategories: CategoryData[] = [];
  expenseCategories: CategoryData[] = [];
  
  // Chart instances
  monthlyChart?: Chart;
  categoryChart?: Chart;
  expenseCategoryChart?: Chart;
  trendChart?: Chart;
  
  // Statistics
  stats = {
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    averageMonthlyIncome: 0,
    averageMonthlyExpenses: 0,
    highestIncomeMonth: { month: '', amount: 0 },
    highestExpenseMonth: { month: '', amount: 0 },
    topIncomeCategory: { name: '', amount: 0 },
    topExpenseCategory: { name: '', amount: 0 },
    savingsRate: 0,
    expenseGrowthRate: 0,
    incomeGrowthRate: 0
  };
  
  // Insights and recommendations
  insights: FinancialInsight[] = [];
  
  isLoading = false;
  chartsReady = false;
  
  private destroy$ = new Subject<void>();

  // Expose Math object to template
  Math = Math;

  constructor(private firestore: AngularFirestore) {}

  ngOnInit(): void {
    this.loadIncomeExpenseData();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    if (this.monthlyTrends.length > 0) {
      this.createCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadIncomeExpenseData(): void {
    this.isLoading = true;
    this.firestore.collection('moneytransactions')
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((transactions: any[]) => {
        // Filter transactions
        this.incomeData = transactions.filter(t => t.action === 'IN' && t.type !== 'RETURN');
        this.expenseData = transactions.filter(t => t.action === 'OUT' && t.type !== 'LENDING');
        
        // Generate all analytics
        this.generateMonthlyTrends(transactions);
        this.generateCategoryAnalysis();
        this.calculateStatistics();
        this.generateInsights();
        
        this.isLoading = false;
        
        if (this.chartsReady) {
          this.createCharts();
        }
      });
  }

  generateMonthlyTrends(transactions: any[]): void {
    const monthlyData: { [key: string]: { income: number, expenses: number } } = {};
    
    // Generate data for last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }

    transactions.forEach(transaction => {
      const transactionDate = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
      const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        if (transaction.action === 'IN' && transaction.type !== 'RETURN') {
          monthlyData[monthKey].income += transaction.amount || 0;
        } else if (transaction.action === 'OUT' && transaction.type !== 'LENDING') {
          monthlyData[monthKey].expenses += transaction.amount || 0;
        }
      }
    });

    this.monthlyTrends = Object.entries(monthlyData).map(([month, data]) => ({
      month: this.formatMonth(month),
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses
    }));
  }

  generateCategoryAnalysis(): void {
    // Income categories analysis
    const incomeCategories: { [key: string]: { amount: number, transactions: number } } = {};
    this.incomeData.forEach(transaction => {
      const category = transaction.incomeof || transaction.type || 'Other';
      if (!incomeCategories[category]) {
        incomeCategories[category] = { amount: 0, transactions: 0 };
      }
      incomeCategories[category].amount += transaction.amount || 0;
      incomeCategories[category].transactions += 1;
    });

    const totalIncome = this.getTotalIncome();
    this.incomeCategories = Object.entries(incomeCategories)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        transactions: data.transactions,
        percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
        color: this.generateCategoryColor(name, 'income')
      }))
      .sort((a, b) => b.amount - a.amount);

    // Expense categories analysis
    const expenseCategories: { [key: string]: { amount: number, transactions: number } } = {};
    this.expenseData.forEach(transaction => {
      const category = transaction.expenseof || transaction.type || 'Other';
      if (!expenseCategories[category]) {
        expenseCategories[category] = { amount: 0, transactions: 0 };
      }
      expenseCategories[category].amount += transaction.amount || 0;
      expenseCategories[category].transactions += 1;
    });

    const totalExpenses = this.getTotalExpenses();
    this.expenseCategories = Object.entries(expenseCategories)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        transactions: data.transactions,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        color: this.generateCategoryColor(name, 'expense')
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  calculateStatistics(): void {
    this.stats.totalIncome = this.getTotalIncome();
    this.stats.totalExpenses = this.getTotalExpenses();
    this.stats.netIncome = this.stats.totalIncome - this.stats.totalExpenses;

    // Monthly averages
    const validMonths = this.monthlyTrends.filter(m => m.income > 0 || m.expenses > 0);
    this.stats.averageMonthlyIncome = validMonths.length > 0 
      ? this.monthlyTrends.reduce((sum, m) => sum + m.income, 0) / this.monthlyTrends.length 
      : 0;
    this.stats.averageMonthlyExpenses = validMonths.length > 0
      ? this.monthlyTrends.reduce((sum, m) => sum + m.expenses, 0) / this.monthlyTrends.length
      : 0;

    // Highest months
    const highestIncomeMonth = this.monthlyTrends.reduce((max, current) => 
      current.income > max.income ? current : max, this.monthlyTrends[0] || { month: '', income: 0, expenses: 0, net: 0 });
    this.stats.highestIncomeMonth = { month: highestIncomeMonth.month, amount: highestIncomeMonth.income };

    const highestExpenseMonth = this.monthlyTrends.reduce((max, current) => 
      current.expenses > max.expenses ? current : max, this.monthlyTrends[0] || { month: '', income: 0, expenses: 0, net: 0 });
    this.stats.highestExpenseMonth = { month: highestExpenseMonth.month, amount: highestExpenseMonth.expenses };

    // Top categories
    this.stats.topIncomeCategory = this.incomeCategories.length > 0 
      ? { name: this.incomeCategories[0].name, amount: this.incomeCategories[0].amount }
      : { name: '', amount: 0 };
    this.stats.topExpenseCategory = this.expenseCategories.length > 0
      ? { name: this.expenseCategories[0].name, amount: this.expenseCategories[0].amount }
      : { name: '', amount: 0 };

    // Financial ratios
    this.stats.savingsRate = this.stats.totalIncome > 0 ? (this.stats.netIncome / this.stats.totalIncome) * 100 : 0;

    // Growth rates (comparing last 3 months vs previous 3 months)
    const recentMonths = this.monthlyTrends.slice(-3);
    const previousMonths = this.monthlyTrends.slice(-6, -3);
    
    const recentAvgIncome = recentMonths.reduce((sum, m) => sum + m.income, 0) / 3;
    const previousAvgIncome = previousMonths.reduce((sum, m) => sum + m.income, 0) / 3;
    this.stats.incomeGrowthRate = previousAvgIncome > 0 ? ((recentAvgIncome - previousAvgIncome) / previousAvgIncome) * 100 : 0;

    const recentAvgExpenses = recentMonths.reduce((sum, m) => sum + m.expenses, 0) / 3;
    const previousAvgExpenses = previousMonths.reduce((sum, m) => sum + m.expenses, 0) / 3;
    this.stats.expenseGrowthRate = previousAvgExpenses > 0 ? ((recentAvgExpenses - previousAvgExpenses) / previousAvgExpenses) * 100 : 0;
  }

  generateInsights(): void {
    this.insights = [];

    // Savings rate insights
    if (this.stats.savingsRate < 10) {
      this.insights.push({
        type: 'warning',
        title: 'Low Savings Rate',
        message: `Your savings rate is ${this.stats.savingsRate.toFixed(1)}%. Consider reducing expenses or increasing income to improve financial health.`,
        value: this.stats.savingsRate,
        trend: 'down'
      });
    } else if (this.stats.savingsRate > 20) {
      this.insights.push({
        type: 'success',
        title: 'Excellent Savings Rate',
        message: `Great job! Your savings rate of ${this.stats.savingsRate.toFixed(1)}% is excellent for building wealth.`,
        value: this.stats.savingsRate,
        trend: 'up'
      });
    }

    // Income growth insights
    if (this.stats.incomeGrowthRate > 5) {
      this.insights.push({
        type: 'success',
        title: 'Income Growth',
        message: `Your income has grown by ${this.stats.incomeGrowthRate.toFixed(1)}% compared to previous months.`,
        value: this.stats.incomeGrowthRate,
        trend: 'up'
      });
    } else if (this.stats.incomeGrowthRate < -5) {
      this.insights.push({
        type: 'danger',
        title: 'Income Decline',
        message: `Your income has decreased by ${Math.abs(this.stats.incomeGrowthRate).toFixed(1)}%. Consider diversifying income sources.`,
        value: this.stats.incomeGrowthRate,
        trend: 'down'
      });
    }

    // Expense growth insights
    if (this.stats.expenseGrowthRate > 10) {
      this.insights.push({
        type: 'warning',
        title: 'Rising Expenses',
        message: `Your expenses have increased by ${this.stats.expenseGrowthRate.toFixed(1)}%. Review your spending habits.`,
        value: this.stats.expenseGrowthRate,
        trend: 'up'
      });
    }

    // Top category insights
    if (this.expenseCategories.length > 0 && this.expenseCategories[0].percentage > 40) {
      this.insights.push({
        type: 'info',
        title: 'Spending Concentration',
        message: `${this.expenseCategories[0].percentage.toFixed(1)}% of your expenses are in ${this.expenseCategories[0].name}. Consider if this allocation is optimal.`,
        value: this.expenseCategories[0].percentage
      });
    }

    // Monthly variance insights
    const monthlyIncomes = this.monthlyTrends.map(m => m.income).filter(i => i > 0);
    const incomeVariance = this.calculateVariance(monthlyIncomes);
    const avgIncome = monthlyIncomes.reduce((sum, i) => sum + i, 0) / monthlyIncomes.length;
    
    if (incomeVariance / (avgIncome * avgIncome) > 0.3) {
      this.insights.push({
        type: 'info',
        title: 'Income Volatility',
        message: 'Your income varies significantly month to month. Consider building an emergency fund to smooth out fluctuations.',
        value: (incomeVariance / (avgIncome * avgIncome)) * 100
      });
    }
  }

  createCharts(): void {
    this.destroyCharts();
    
    setTimeout(() => {
      this.createMonthlyTrendChart();
      this.createCategoryPieChart();
      this.createExpenseCategoryChart();
      this.createNetIncomeChart();
    }, 100);
  }

  createMonthlyTrendChart(): void {
    if (!this.monthlyChartRef?.nativeElement) return;

    const ctx = this.monthlyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.monthlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.monthlyTrends.map(m => m.month),
        datasets: [
          {
            label: 'Income',
            data: this.monthlyTrends.map(m => m.income),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Expenses',
            data: this.monthlyTrends.map(m => m.expenses),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Monthly Income vs Expenses Trend'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(value as number);
              }
            }
          }
        }
      }
    });
  }

  createCategoryPieChart(): void {
    if (!this.categoryChartRef?.nativeElement || this.incomeCategories.length === 0) return;

    const ctx = this.categoryChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.incomeCategories.slice(0, 8).map(c => c.name),
        datasets: [{
          data: this.incomeCategories.slice(0, 8).map(c => c.amount),
          backgroundColor: this.incomeCategories.slice(0, 8).map(c => c.color),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: 'Income by Category'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const category = this.incomeCategories[context.dataIndex];
                return `${category.name}: ${this.formatCurrency(category.amount)} (${category.percentage.toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });
  }

  createExpenseCategoryChart(): void {
    if (!this.expenseCategoryChartRef?.nativeElement || this.expenseCategories.length === 0) return;

    const ctx = this.expenseCategoryChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.expenseCategoryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.expenseCategories.slice(0, 8).map(c => c.name),
        datasets: [{
          label: 'Amount Spent',
          data: this.expenseCategories.slice(0, 8).map(c => c.amount),
          backgroundColor: this.expenseCategories.slice(0, 8).map(c => c.color),
          borderWidth: 1,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Top Expense Categories'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const category = this.expenseCategories[context.dataIndex];
                return `${category.name}: ${this.formatCurrency(category.amount)} (${category.percentage.toFixed(1)}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(value as number);
              }
            }
          }
        }
      }
    });
  }

  createNetIncomeChart(): void {
    if (!this.trendChartRef?.nativeElement) return;

    const ctx = this.trendChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.trendChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.monthlyTrends.map(m => m.month),
        datasets: [{
          label: 'Net Income',
          data: this.monthlyTrends.map(m => m.net),
          backgroundColor: this.monthlyTrends.map(m => m.net >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
          borderColor: this.monthlyTrends.map(m => m.net >= 0 ? '#10b981' : '#ef4444'),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Monthly Net Income (Profit/Loss)'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(value as number);
              }
            }
          }
        }
      }
    });
  }

  destroyCharts(): void {
    if (this.monthlyChart) {
      this.monthlyChart.destroy();
      this.monthlyChart = undefined;
    }
    if (this.categoryChart) {
      this.categoryChart.destroy();
      this.categoryChart = undefined;
    }
    if (this.expenseCategoryChart) {
      this.expenseCategoryChart.destroy();
      this.expenseCategoryChart = undefined;
    }
    if (this.trendChart) {
      this.trendChart.destroy();
      this.trendChart = undefined;
    }
  }

  formatMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getTotalIncome(): number {
    return this.incomeData.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getTotalExpenses(): number {
    return this.expenseData.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  generateCategoryColor(category: string, type: 'income' | 'expense'): string {
    const incomeColors = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#0ea5e9', '#0284c7'];
    const expenseColors = ['#ef4444', '#dc2626', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#f59e0b', '#d97706'];
    
    const colors = type === 'income' ? incomeColors : expenseColors;
    const hash = category.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }

  calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  getInsightIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'danger': return 'error';
      case 'info': return 'info';
      default: return 'lightbulb';
    }
  }

  getInsightClass(type: string): string {
    return `insight-${type}`;
  }

  // Method to determine responsive font size class based on amount
  getAmountSizeClass(amount: number): string {
    const absAmount = Math.abs(amount);
    
    if (absAmount < 100000) {
      return 'small-amount';
    } else if (absAmount < 10000000) {
      return 'medium-amount';
    } else if (absAmount < 1000000000) {
      return 'large-amount';
    } else {
      return 'extra-large-amount';
    }
  }
} 