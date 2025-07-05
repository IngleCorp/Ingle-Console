import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface Type {
  id?: string;
  name: string;
  category: 'EXPENSE' | 'INCOME';
  position: number;
  is_active: boolean;
  is_deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  createdByName?: string;
}

@Component({
  selector: 'app-types',
  templateUrl: './types.component.html',
  styleUrl: './types.component.scss'
})
export class TypesComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  types: Type[] = [];
  filteredTypes: Type[] = [];
  dataSource = new MatTableDataSource<Type>([]);
  displayedColumns: string[] = ['name', 'category', 'position', 'status', 'actions'];
  
  // Filter properties
  searchTerm: string = '';
  selectedCategory: string = 'all';
  selectedStatus: string = 'all';
  
  // UI properties
  isLoading: boolean = false;
  viewMode: 'grid' | 'list' = 'grid';
  
  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadTypes(): void {
    this.isLoading = true;
    this.firestore.collection('types', ref => ref.orderBy('position'))
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any[]) => {
        this.types = data.filter(type => !type.is_deleted);
        this.applyFilter();
        this.isLoading = false;
        console.log('Types loaded:', this.types);
      }, (error) => {
        console.error('Error loading types:', error);
        this.showNotification('Error loading types', 'error');
        this.isLoading = false;
      });
  }

  applyFilter(): void {
    let filtered = [...this.types];

    // Filter by search term
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(type => 
        type.name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(type => type.category === this.selectedCategory);
    }

    // Filter by status
    if (this.selectedStatus !== 'all') {
      const isActive = this.selectedStatus === 'active';
      filtered = filtered.filter(type => type.is_active === isActive);
    }

    this.filteredTypes = filtered;
    this.dataSource.data = filtered;
  }

  onViewModeChange(): void {
    // Handle view mode change if needed
    console.log('View mode changed to:', this.viewMode);
  }

  openTypesForm(type?: Type): void {
    if (type) {
      // Navigate to edit form with type data
      this.router.navigate(['/admin/types/form'], { queryParams: { id: type.id } });
    } else {
      // Navigate to create form
      this.router.navigate(['/admin/types/form']);
    }
  }

  editType(type: Type): void {
    this.openTypesForm(type);
  }

  async toggleTypeStatus(type: Type): Promise<void> {
    try {
      const user = await this.auth.currentUser;
      const newStatus = !type.is_active;
      
      await this.firestore.collection('types').doc(type.id).update({
        is_active: newStatus,
        updatedAt: new Date(),
        updatedBy: user?.uid,
        updatedByName: user?.displayName || user?.email || 'Unknown User'
      });

      // Create activity record
      if (user) {
        await this.firestore.collection('activities').add({
          type: 'type',
          action: newStatus ? 'Activated' : 'Deactivated',
          entityId: type.id,
          entityName: type.name,
          details: `Type "${type.name}" ${newStatus ? 'activated' : 'deactivated'}`,
          createdAt: new Date(),
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Unknown User',
          icon: newStatus ? 'toggle_on' : 'toggle_off'
        });
      }

      this.showNotification(
        `Type ${newStatus ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
    } catch (error) {
      console.error('Error updating type status:', error);
      this.showNotification('Error updating type status', 'error');
    }
  }

  async deleteType(type: Type): Promise<void> {
    const confirmMessage = `Are you sure you want to delete "${type.name}"? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      try {
        const user = await this.auth.currentUser;
        
        // Soft delete - mark as deleted
        await this.firestore.collection('types').doc(type.id).update({
          is_deleted: true,
          updatedAt: new Date(),
          updatedBy: user?.uid,
          updatedByName: user?.displayName || user?.email || 'Unknown User'
        });

        // Create activity record
        if (user) {
          await this.firestore.collection('activities').add({
            type: 'type',
            action: 'Deleted',
            entityId: type.id,
            entityName: type.name,
            details: `Type "${type.name}" deleted`,
            createdAt: new Date(),
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'Unknown User',
            icon: 'delete'
          });
        }

        this.showNotification('Type deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting type:', error);
        this.showNotification('Error deleting type', 'error');
      }
    }
  }

  // Statistics methods
  getExpenseTypesCount(): number {
    return this.types.filter(type => type.category === 'EXPENSE' && type.is_active).length;
  }

  getIncomeTypesCount(): number {
    return this.types.filter(type => type.category === 'INCOME' && type.is_active).length;
  }

  getActiveTypesCount(): number {
    return this.types.filter(type => type.is_active).length;
  }

  // Helper methods
  getCategoryIcon(category: string): string {
    switch (category) {
      case 'EXPENSE':
        return 'remove_circle';
      case 'INCOME':
        return 'add_circle';
      default:
        return 'category';
    }
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? 'success-snackbar' : 'error-snackbar'
    });
  }
}
