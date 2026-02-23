import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

const OWN_PROJECTS_COLLECTION = 'ownProjects';

@Component({
  selector: 'app-own-project-accounts',
  templateUrl: './own-project-accounts.component.html',
  styleUrls: ['./own-project-accounts.component.scss']
})
export class OwnProjectAccountsComponent implements OnInit, OnDestroy {
  projectId: string | null = null;
  accounts: any[] = [];
  filteredAccounts: any[] = [];
  showAddForm = false;
  searchTerm = '';
  showPasswords: Record<string, boolean> = {};
  accountForm: FormGroup;
  editingAccount: any = null;
  private accountsSub?: Subscription;

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
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
    this.route.parent?.paramMap?.subscribe(params => {
      this.projectId = params.get('projectId') ?? null;
      this.accountsSub?.unsubscribe();
      if (this.projectId) this.getAccounts();
      else {
        this.accounts = [];
        this.filteredAccounts = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.accountsSub?.unsubscribe();
  }

  getAccounts(): void {
    if (!this.projectId) return;
    this.accountsSub = this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('accounts')
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          this.accounts = data || [];
          this.filteredAccounts = [...this.accounts];
        },
        error: () => this.snackBar.open('Error loading accounts', 'Close', { duration: 3000 })
      });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) this.resetForm();
  }

  addAccount(): void {
    if (this.accountForm.invalid || !this.projectId) {
      this.accountForm.markAllAsTouched();
      return;
    }
    const payload = {
      ...this.accountForm.value,
      createdAt: new Date(),
      createdBy: localStorage.getItem('userid') || '',
      createdbyname: localStorage.getItem('username') || 'Unknown'
    };
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('accounts').add(payload)
      .then(() => {
        this.snackBar.open('Account added', 'Close', { duration: 3000 });
        this.resetForm();
        this.getAccounts();
      })
      .catch(() => this.snackBar.open('Add failed', 'Close', { duration: 3000 }));
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
    if (this.accountForm.invalid || !this.projectId || !this.editingAccount) return;
    const payload = {
      ...this.accountForm.value,
      updatedAt: new Date(),
      updatedBy: localStorage.getItem('userid') || '',
      updatedbyname: localStorage.getItem('username') || 'Unknown'
    };
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('accounts')
      .doc(this.editingAccount.id).update(payload)
      .then(() => {
        this.snackBar.open('Account updated', 'Close', { duration: 3000 });
        this.resetForm();
        this.getAccounts();
      })
      .catch(() => this.snackBar.open('Update failed', 'Close', { duration: 3000 }));
  }

  deleteAccount(id: string, name: string): void {
    if (!confirm(`Delete "${name}"?`)) return;
    if (!this.projectId) return;
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('accounts').doc(id).delete()
      .then(() => {
        this.snackBar.open('Account deleted', 'Close', { duration: 3000 });
        this.getAccounts();
      })
      .catch(() => this.snackBar.open('Delete failed', 'Close', { duration: 3000 }));
  }

  resetForm(): void {
    this.accountForm.reset();
    this.editingAccount = null;
    this.showAddForm = false;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() =>
      this.snackBar.open('Copied', 'Close', { duration: 2000 })
    );
  }

  togglePasswordVisibility(id: string): void {
    this.showPasswords[id] = !this.showPasswords[id];
  }

  searchAccounts(): void {
    if (!this.searchTerm.trim()) {
      this.filteredAccounts = [...this.accounts];
    } else {
      const q = this.searchTerm.toLowerCase();
      this.filteredAccounts = this.accounts.filter(a =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.username && a.username.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q))
      );
    }
  }

  trackByAccount(_: number, a: any): string {
    return a.id;
  }
}
