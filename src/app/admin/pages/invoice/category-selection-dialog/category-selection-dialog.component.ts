import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface Type {
  id?: string;
  name: string;
  category: 'EXPENSE' | 'INCOME';
  position: number;
  is_active: boolean;
  is_deleted: boolean;
}

@Component({
  selector: 'app-category-selection-dialog',
  templateUrl: './category-selection-dialog.component.html',
  styleUrls: ['./category-selection-dialog.component.scss']
})
export class CategorySelectionDialogComponent implements OnInit, OnDestroy {
  selectedCategory: string = '';
  incomeCategories: Type[] = [];
  loading: boolean = true;
  
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<CategorySelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { invoiceNumber: string, amount: number },
    private firestore: AngularFirestore
  ) {}

  ngOnInit(): void {
    this.loadIncomeCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadIncomeCategories(): void {
    this.loading = true;
    this.firestore.collection('types', ref => 
      ref.where('category', '==', 'INCOME')
         .where('is_active', '==', true)
         .where('is_deleted', '==', false)
         .orderBy('position')
    ).valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((categories: any[]) => {
        this.incomeCategories = categories;
        if (categories.length > 0) {
          this.selectedCategory = categories[0].name; // Set first category as default
        }
        this.loading = false;
      }, (error) => {
        console.error('Error loading income categories:', error);
        // Fallback to default categories if Firebase query fails
        this.incomeCategories = [
          { name: 'Service Revenue', category: 'INCOME', position: 1, is_active: true, is_deleted: false }
        ];
        this.selectedCategory = 'Service Revenue';
        this.loading = false;
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.selectedCategory);
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
} 