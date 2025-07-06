import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
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
    private auth: AngularFireAuth,
    private functions: AngularFireFunctions,
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

  async deleteUser(user: User): Promise<void> {
    if (!user.id) {
      this.showNotification('User ID not found', 'error');
      return;
    }

    const confirmMessage = user.firebaseUid 
      ? `Are you sure you want to delete ${user.name}?\n\nThis will permanently delete the user from both the database and Firebase Authentication.`
      : `Are you sure you want to delete ${user.name}?\n\nThis user hasn't activated their account yet.`;

    if (confirm(confirmMessage)) {
      try {
        const currentUser = await this.auth.currentUser;
        
        if (!currentUser) {
          this.showNotification('Admin authentication required', 'error');
          return;
        }

        // Step 1: Delete from Firestore first
        await this.firestore.collection('users').doc(user.id).delete();

        // Step 2: Handle Firebase Auth deletion if user has firebaseUid
        if (user.firebaseUid) {
          try {
            // Call the Cloud Function to delete from Firebase Auth
            await this.callDeleteUserCloudFunction(user.firebaseUid);
            
            this.showNotification(
              `User ${user.name} deleted successfully from both database and Firebase Authentication!`,
              'success'
            );
          } catch (authError: any) {
            console.error('Firebase Auth deletion error:', authError);
            this.showNotification(
              `User ${user.name} deleted from database, but Firebase Auth deletion failed: ${authError.message || 'Unknown error'}`,
              'error'
            );
          }
        } else {
          // User only existed in Firestore (pending activation)
          this.showNotification(`User ${user.name} deleted successfully!`, 'success');
        }

        // Step 3: Create activity record for user deletion
        await this.firestore.collection('activities').add({
          type: 'user',
          action: 'Deleted',
          entityId: user.id,
          entityName: user.name || 'Unknown User',
          details: `User ${user.name || 'Unknown'} (${user.email || 'Unknown'}) with role ${user.role || 'unknown'} was deleted from the system`,
          createdAt: new Date(),
          createdBy: currentUser.uid,
          createdByName: currentUser.displayName || currentUser.email || 'Admin',
          icon: 'delete',
          metadata: this.createSafeUserMetadata(user)
        });

        // Step 4: Refresh the user list
        this.getUsers();

      } catch (error: any) {
        console.error('Error deleting user:', error);
        let errorMessage = 'Error deleting user. Please try again.';
        
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. You do not have rights to delete this user.';
        } else if (error.code === 'not-found') {
          errorMessage = 'User not found. It may have already been deleted.';
        }
        
        this.showNotification(errorMessage, 'error');
      }
    }
  }

  // Helper method to create safe metadata object without undefined values
  private createSafeUserMetadata(user: User): any {
    return {
      hadFirebaseAuth: !!user.firebaseUid,
      userRole: user.role || 'unknown',
      userDepartment: user.department || 'unknown',
      accountStatus: user.accountStatus || 'unknown',
      isActive: user.isActive !== undefined ? user.isActive : false,
      activationRequired: user.activationRequired !== undefined ? user.activationRequired : false,
      createdAt: user.createdAt || null,
      updatedAt: user.updatedAt || null
    };
  }

  // Method to call Cloud Function for Firebase Auth deletion
  private async callDeleteUserCloudFunction(firebaseUid: string): Promise<void> {
    try {
      // Call the Cloud Function
      const deleteUserFunction = this.functions.httpsCallable('deleteUserFromAuth');
      const result$ = deleteUserFunction({ uid: firebaseUid });
      const result = await result$.toPromise();
      
      console.log('Cloud Function result:', result);
      
      if (result?.success) {
        console.log('User successfully deleted from Firebase Auth');
      } else {
        throw new Error(result?.message || 'Failed to delete user from Firebase Auth');
      }
    } catch (error: any) {
      console.error('Cloud Function error:', error);
      
      // Handle specific Cloud Function errors
      if (error.code === 'unauthenticated') {
        throw new Error('Authentication required to delete user');
      } else if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Only admins can delete users');
      } else if (error.code === 'not-found') {
        throw new Error('User not found in Firebase Auth');
      } else if (error.code === 'invalid-argument') {
        throw new Error('Invalid user ID provided');
      }
      
      throw new Error(error.message || 'Failed to delete user from Firebase Auth');
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
      'staff': '#3b82f6',
      'developer': '#10b981',
      'designer': '#f59e0b',
      'client': '#8b5cf6'
    };
    return roleColors[role] || '#6b7280';
  }

  getRoleIcon(role: string): string {
    const roleIcons: { [key: string]: string } = {
      'admin': 'admin_panel_settings',
      'staff': 'badge',
      'developer': 'code',
      'designer': 'palette',
      'client': 'person_outline'
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