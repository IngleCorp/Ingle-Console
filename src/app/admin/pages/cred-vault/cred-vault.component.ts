import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Clipboard } from '@angular/cdk/clipboard';

export interface Credential {
  id?: string;
  name: string;
  username: string;
  password: string;
  description?: string;
  category?: string;
  url?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedByName?: string;
}

@Component({
  selector: 'app-cred-vault',
  templateUrl: './cred-vault.component.html',
  styleUrls: ['./cred-vault.component.scss']
})
export class CredVaultComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  credentials: Credential[] = [];
  dataSource = new MatTableDataSource<Credential>([]);
  displayedColumns: string[] = ['name', 'username', 'password', 'category', 'status', 'actions'];
  
  credentialForm: FormGroup;
  isAddingCredential = false;
  isEditing = false;
  editingCredentialId: string | null = null;
  passwordVisible = false;
  searchTerm = '';
  selectedCategory = 'all';
  isLoading = false;

  categories = [
    'Social Media',
    'Email',
    'Banking',
    'Shopping',
    'Work',
    'Personal',
    'Development',
    'Other'
  ];

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private clipboard: Clipboard
  ) {
    this.credentialForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadCredentials();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      description: [''],
      category: ['Other', Validators.required],
      url: [''],
      isActive: [true]
    });
  }

  async loadCredentials(): Promise<void> {
    this.isLoading = true;
    try {
      const user = await this.auth.currentUser;
      if (user) {
        this.firestore.collection('cred', ref => 
          ref.orderBy('createdAt', 'desc')
        ).valueChanges({ idField: 'id' }).subscribe((data: any) => {
          this.credentials = data;
          console.log('Loaded credentials:', this.credentials);
          this.dataSource.data = data;
          this.isLoading = false;
        });
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      this.showNotification('Error loading credentials', 'error');
      this.isLoading = false;
    }
  }

  async addCredential(): Promise<void> {
    if (this.credentialForm.valid) {
      this.isLoading = true;
      try {
        const user = await this.auth.currentUser;
        if (user) {
          const formData = this.credentialForm.value;
          const credentialData: Credential = {
            ...formData,
            createdAt: new Date(),
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'Unknown User'
          };

          await this.firestore.collection('credentials').add(credentialData);
          this.showNotification('Credential added successfully!', 'success');
          this.resetForm();
          this.loadCredentials();
        }
      } catch (error) {
        console.error('Error adding credential:', error);
        this.showNotification('Error adding credential', 'error');
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  async updateCredential(): Promise<void> {
    if (this.credentialForm.valid && this.editingCredentialId) {
      this.isLoading = true;
      try {
        const user = await this.auth.currentUser;
        if (user) {
          const formData = this.credentialForm.value;
          const updateData = {
            ...formData,
            updatedAt: new Date(),
            updatedBy: user.uid,
            updatedByName: user.displayName || user.email || 'Unknown User'
          };

          await this.firestore.collection('credentials').doc(this.editingCredentialId).update(updateData);
          this.showNotification('Credential updated successfully!', 'success');
          this.resetForm();
          this.loadCredentials();
        }
      } catch (error) {
        console.error('Error updating credential:', error);
        this.showNotification('Error updating credential', 'error');
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  editCredential(credential: Credential): void {
    this.isEditing = true;
    this.editingCredentialId = credential.id || null;
    this.credentialForm.patchValue({
      name: credential.name,
      username: credential.username,
      password: credential.password,
      description: credential.description || '',
      category: credential.category || 'Other',
      url: credential.url || '',
      isActive: credential.isActive
    });
    this.isAddingCredential = true;
  }

  async deleteCredential(credentialId: string): Promise<void> {
    if (confirm('Are you sure you want to delete this credential? This action cannot be undone.')) {
      this.isLoading = true;
      try {
        await this.firestore.collection('credentials').doc(credentialId).delete();
        this.showNotification('Credential deleted successfully!', 'success');
        this.loadCredentials();
      } catch (error) {
        console.error('Error deleting credential:', error);
        this.showNotification('Error deleting credential', 'error');
      } finally {
        this.isLoading = false;
      }
    }
  }

  copyToClipboard(text: string, type: string): void {
    this.clipboard.copy(text);
    this.showNotification(`${type} copied to clipboard!`, 'success');
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  generatePassword(): void {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    this.credentialForm.patchValue({ password });
  }

  resetForm(): void {
    this.credentialForm.reset({
      category: 'Other',
      isActive: true
    });
    this.isAddingCredential = false;
    this.isEditing = false;
    this.editingCredentialId = null;
    this.passwordVisible = false;
  }

  cancelForm(): void {
    this.resetForm();
  }

  applyFilter(): void {
    let filteredData = this.credentials;

    // Filter by search term
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filteredData = filteredData.filter(cred => 
        cred.name.toLowerCase().includes(search) ||
        cred.username.toLowerCase().includes(search) ||
        cred.description?.toLowerCase().includes(search) ||
        cred.category?.toLowerCase().includes(search)
      );
    }

    // Filter by category
    if (this.selectedCategory !== 'all') {
      filteredData = filteredData.filter(cred => cred.category === this.selectedCategory);
    }

    this.dataSource.data = filteredData;
  }

  markFormGroupTouched(): void {
    Object.keys(this.credentialForm.controls).forEach(key => {
      const control = this.credentialForm.get(key);
      control?.markAsTouched();
    });
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: type === 'success' ? ['success-snackbar'] : 
                  type === 'error' ? ['error-snackbar'] : ['info-snackbar']
    });
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'Social Media': '#3b82f6',
      'Email': '#8b5cf6',
      'Banking': '#ef4444',
      'Shopping': '#f59e0b',
      'Work': '#10b981',
      'Personal': '#06b6d4',
      'Development': '#84cc16',
      'Other': '#6b7280'
    };
    return colors[category] || '#6b7280';
  }

  // Form getters for easy access in template
  get name() { return this.credentialForm.get('name'); }
  get username() { return this.credentialForm.get('username'); }
  get password() { return this.credentialForm.get('password'); }
  get category() { return this.credentialForm.get('category'); }
} 