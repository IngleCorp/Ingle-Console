import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UserFormComponent, User } from './user-form/user-form.component';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface Car {
  make: string;
  model: string;
  price: number;
}

const CAR_DATA: Car[] = [
  { make: 'Toyota', model: 'Corolla', price: 30000 },
  { make: 'Ford', model: 'Fiesta', price: 25000 },
  { make: 'BMW', model: 'X5', price: 55000 },
  { make: 'Audi', model: 'A4', price: 45000 },
  { make: 'Honda', model: 'Civic', price: 27000 }
];

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements AfterViewInit {
  constructor(
    private firestore: AngularFirestore,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.getUsers();
  }

  displayedColumns: string[] = ['name', 'email', 'role', 'department', 'status', 'actions'];
  dataSource = new MatTableDataSource<User>([]);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openUserForm(user?: User): void {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: { user },
      disableClose: true,
      panelClass: 'user-form-dialog'
    });

    dialogRef.afterClosed().subscribe((result: User) => {
      if (result) {
        this.getUsers(); // Refresh the user list
        this.showNotification(
          user ? 'User updated successfully!' : 'User created successfully!',
          'success'
        );
      }
    });
  }

  viewUserDetails(user: User): void {
    this.openUserForm(user);
  }

  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      this.firestore.collection('users').doc(user.id).delete()
        .then(() => {
          this.getUsers(); // Refresh the user list
          this.showNotification('User deleted successfully!', 'success');
        })
        .catch((error) => {
          console.error('Error deleting user:', error);
          this.showNotification('Error deleting user. Please try again.', 'error');
        });
    }
  }

  getUsers() {
    this.firestore.collection('users').valueChanges({ idField: 'id' }).subscribe((data: any) => {
      console.log('Users data:', data);
      this.dataSource.data = data;
    });
  }

  getRoleColor(role: string): string {
    const roleColors: { [key: string]: string } = {
      'admin': '#ef4444',
      'manager': '#f59e0b',
      'user': '#3b82f6',
      'viewer': '#10b981'
    };
    return roleColors[role] || '#6b7280';
  }

  getRoleIcon(role: string): string {
    const roleIcons: { [key: string]: string } = {
      'admin': 'admin_panel_settings',
      'manager': 'manage_accounts',
      'user': 'person',
      'viewer': 'visibility'
    };
    return roleIcons[role] || 'person';
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }
}