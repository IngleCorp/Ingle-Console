import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GeneralService } from '../../../../core/services/general.service';
import { ClientAddComponent } from '../client-add/client-add.component';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  image?: string;
  imageRef?: string;
  status?: string;
  manageby?: string;
  projectCount?: number;
  totalRevenue?: number;
  createdAt?: any;
  createdBy?: string;
  createdByName?: string;
  updatedAt?: any;
}

@Component({
  selector: 'app-clients-list',
  templateUrl: './clients-list.component.html',
  styleUrls: ['./clients-list.component.scss']
})
export class ClientsListComponent implements OnInit, OnDestroy {
  clientList: Client[] = [];
  filteredClients: Client[] = [];
  isLoading = false;
  searchTerm = '';
  sortBy: 'name' | 'createdAt' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  viewMode: 'grid' | 'list' = 'grid';
  
  private destroy$ = new Subject<void>();

  // Sort options for dropdown
  sortOptions = [
    { value: 'name-asc', label: 'Name A-Z', sortBy: 'name' as const, sortOrder: 'asc' as const },
    { value: 'name-desc', label: 'Name Z-A', sortBy: 'name' as const, sortOrder: 'desc' as const },
    { value: 'date-desc', label: 'Newest First', sortBy: 'createdAt' as const, sortOrder: 'desc' as const },
    { value: 'date-asc', label: 'Oldest First', sortBy: 'createdAt' as const, sortOrder: 'asc' as const }
  ];

  constructor(
    private afs: AngularFirestore,
    private storage: AngularFireStorage,
    private dialog: MatDialog,
    private service: GeneralService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.getClients();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addClient(): void {
    const dialogRef = this.dialog.open(ClientAddComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.success) {
        this.getClients(); // Refresh the list if a client was added
        this.showNotification('Client added successfully!', 'success');
      }
    });
  }

  getClients(): void {
    this.isLoading = true;
    this.afs.collection('clients')
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients: any[]) => {
          // Ensure all clients have a status field (default to 'active')
          this.clientList = clients.map(client => ({
            ...client,
            status: client.status || 'active'
          }));
          this.applyFiltersAndSort();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading clients:', error);
          this.isLoading = false;
          this.showNotification('Error loading clients', 'error');
        }
      });
  }

  deleteClient(client: Client): void {
    const confirmed = confirm(`Are you sure you want to delete "${client.name}"?\n\nThis action cannot be undone and will remove all associated data.`);
    
    if (confirmed) {
      this.performDeleteClient(client);
    }
  }

  private async performDeleteClient(client: Client): Promise<void> {
    try {
      this.isLoading = true;

      // Delete client document
      await this.afs.collection('clients').doc(client.id).delete();

      // Delete client image from storage if exists
      if (client.imageRef) {
        try {
          await this.storage.ref(client.imageRef).delete().toPromise();
        } catch (storageError) {
          console.warn('Error deleting client image:', storageError);
          // Continue with deletion even if image deletion fails
        }
      }

      // Log activity
      await this.afs.collection('activities').add({
        type: 'client',
        action: 'Deleted',
        entityId: client.id,
        entityName: client.name,
        details: `Client "${client.name}" has been deleted`,
        createdAt: new Date(),
        createdBy: localStorage.getItem('userid') || '',
        createdByName: localStorage.getItem('username') || 'Unknown User',
        icon: 'delete'
      });

      this.showNotification('Client deleted successfully', 'success');
      this.getClients(); // Refresh the list
    } catch (error) {
      console.error('Error deleting client:', error);
      this.showNotification('Error deleting client', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyFiltersAndSort();
  }

  onSortChange(sortOption: string): void {
    const option = this.sortOptions.find(opt => opt.value === sortOption);
    if (option) {
      this.sortBy = option.sortBy;
      this.sortOrder = option.sortOrder;
      this.applyFiltersAndSort();
    }
  }

  switchViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  private applyFiltersAndSort(): void {
    let filtered = [...this.clientList];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.toLowerCase().includes(searchLower) ||
        client.address?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          comparison = dateA.getTime() - dateB.getTime();
          break;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    this.filteredClients = filtered;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFiltersAndSort();
  }

  gohome(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  gotoClientHome(id: string): void {
    this.router.navigate([id, 'projects'], { relativeTo: this.route });
  }

  formatDate(date: any): string {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatStatus(status: string): string {
    if (!status) return 'Active';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? ['success-snackbar'] : 
                  type === 'error' ? ['error-snackbar'] : ['warning-snackbar']
    });
  }
}
