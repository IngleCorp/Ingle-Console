import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-project-accounts',
  templateUrl: './project-accounts.component.html',
  styleUrls: ['./project-accounts.component.scss']
})
export class ProjectAccountsComponent implements OnInit {
  projectId: string | null = null;
  accounts: any[] = [];
  isLoading: boolean = false;
  showAddForm: boolean = false;
  searchTerm: string = '';
  filteredAccounts: any[] = [];
  showPasswords: { [key: string]: boolean } = {};

  // Form for adding/editing accounts
  accountForm: FormGroup;
  editingAccount: any = null;

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      description: [''],
      url: ['']
    });
  }

  ngOnInit(): void {
    localStorage.setItem('pactivetab', 'accounts');
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    console.log('Project ID:', this.projectId);
    this.getAccounts();
  }

  getAccounts(): void {
    if (!this.projectId) return;
    
    this.isLoading = true;
    this.afs.collection('projects').doc(this.projectId).collection('accounts')
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          console.log('Project accounts:', data);
          this.accounts = data || [];
          this.filteredAccounts = [...this.accounts];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching accounts:', error);
          this.isLoading = false;
          this.showNotification('Error loading accounts', 'error');
        }
      });
  }

  addAccount(): void {
    if (this.accountForm.valid) {
      if (!this.projectId) {
        this.showNotification('Project ID not found', 'error');
        return;
      }

      const accountData = {
        ...this.accountForm.value,
        createdAt: new Date(),
        createdBy: localStorage.getItem('userid') || 'unknown',
        createdbyname: localStorage.getItem('username') || 'Unknown User'
      };

      this.afs.collection('projects').doc(this.projectId).collection('accounts')
        .add(accountData)
        .then(() => {
          this.showNotification('Account added successfully', 'success');
          this.resetForm();
          this.getAccounts();
        })
        .catch((error) => {
          console.error('Error adding account:', error);
          this.showNotification('Error adding account', 'error');
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  editAccount(account: any): void {
    this.editingAccount = account;
    this.accountForm.patchValue({
      name: account.name,
      username: account.username,
      password: account.password,
      description: account.description || '',
      url: account.url || ''
    });
    this.showAddForm = true;
  }

  updateAccount(): void {
    if (this.accountForm.valid && this.editingAccount) {
      if (!this.projectId) {
        this.showNotification('Project ID not found', 'error');
        return;
      }

      const accountData = {
        ...this.accountForm.value,
        updatedAt: new Date(),
        updatedBy: localStorage.getItem('userid') || 'unknown',
        updatedbyname: localStorage.getItem('username') || 'Unknown User'
      };

      this.afs.collection('projects').doc(this.projectId).collection('accounts')
        .doc(this.editingAccount.id)
        .update(accountData)
        .then(() => {
          this.showNotification('Account updated successfully', 'success');
          this.resetForm();
          this.getAccounts();
        })
        .catch((error) => {
          console.error('Error updating account:', error);
          this.showNotification('Error updating account', 'error');
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  deleteAccount(accountId: string, accountName: string): void {
    if (confirm(`Are you sure you want to delete the account "${accountName}"?`)) {
      if (!this.projectId) return;

      this.afs.collection('projects').doc(this.projectId).collection('accounts')
        .doc(accountId)
        .delete()
        .then(() => {
          this.showNotification('Account deleted successfully', 'success');
          this.getAccounts();
        })
        .catch((error) => {
          console.error('Error deleting account:', error);
          this.showNotification('Error deleting account', 'error');
        });
    }
  }

  copyToClipboard(text: string, type: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification(`${type} copied to clipboard`, 'success');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showNotification(`${type} copied to clipboard`, 'success');
    });
  }

  searchAccounts(): void {
    if (!this.searchTerm.trim()) {
      this.filteredAccounts = [...this.accounts];
    } else {
      this.filteredAccounts = this.accounts.filter(account =>
        account.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        account.username.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (account.description && account.description.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredAccounts = [...this.accounts];
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.accountForm.reset();
    this.editingAccount = null;
    this.showAddForm = false;
  }

  markFormGroupTouched(): void {
    Object.keys(this.accountForm.controls).forEach(key => {
      const control = this.accountForm.get(key);
      control?.markAsTouched();
    });
  }

  getCreatedDateDisplay(createdAt: any): string {
    if (!createdAt?.seconds) {
      return 'N/A';
    }
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

  trackByAccount(index: number, account: any): string {
    return account.id;
  }

  togglePasswordVisibility(accountId: string): void {
    this.showPasswords[accountId] = !this.showPasswords[accountId];
  }

  isPasswordVisible(accountId: string): boolean {
    return this.showPasswords[accountId] || false;
  }
} 