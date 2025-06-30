import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  department: string;
  phone: string;
  avatar?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss'
})
export class UserFormComponent implements OnInit {
  userForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  passwordVisible = false;
  confirmPasswordVisible = false;

  roles = [
    { value: 'admin', label: 'Administrator', icon: 'admin_panel_settings', color: '#ef4444' },
    { value: 'manager', label: 'Manager', icon: 'manage_accounts', color: '#f59e0b' },
    { value: 'user', label: 'User', icon: 'person', color: '#3b82f6' },
    { value: 'viewer', label: 'Viewer', icon: 'visibility', color: '#10b981' }
  ];

  departments = [
    'Engineering',
    'Design',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Support',
    'Product Management',
    'Quality Assurance'
  ];

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<UserFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user?: User }
  ) {
    this.userForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.data?.user) {
      this.isEditMode = true;
      this.loadUserData(this.data.user);
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required],
      department: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      avatar: [''],
      isActive: [true],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', this.isEditMode ? [] : [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  loadUserData(user: User): void {
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive
    });

    if (user.avatar) {
      this.previewUrl = user.avatar;
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        this.showNotification('File size should be less than 5MB', 'error');
        return;
      }

      if (!file.type.startsWith('image/')) {
        this.showNotification('Please select an image file', 'error');
        return;
      }

      this.selectedFile = file;
      this.createPreview(file);
    }
  }

  createPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.userForm.patchValue({ avatar: '' });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  getRoleInfo(roleValue: string): any {
    return this.roles.find(role => role.value === roleValue);
  }

  getRoleDescription(roleValue: string): string {
    const descriptions: { [key: string]: string } = {
      'admin': 'Full system access and user management',
      'manager': 'Team management and project oversight',
      'user': 'Standard user with basic permissions',
      'viewer': 'Read-only access to assigned areas'
    };
    return descriptions[roleValue] || 'No description available';
  }

  async onSubmit(): Promise<void> {
    if (this.userForm.valid) {
      this.isLoading = true;
      try {
        const formData = this.userForm.value;
        const userData: User = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          phone: formData.phone,
          avatar: this.previewUrl || formData.avatar,
          isActive: formData.isActive,
          updatedAt: new Date()
        };

        if (!this.isEditMode) {
          userData.createdAt = new Date();
          // Create user in Firebase Auth
          const userCredential = await this.auth.createUserWithEmailAndPassword(
            formData.email,
            formData.password
          );
          userData.id = userCredential.user?.uid;
        }

        if (this.isEditMode && this.data.user?.id) {
          await this.firestore.collection('users').doc(this.data.user.id).update(userData);
          this.showNotification('User updated successfully!', 'success');
        } else {
          await this.firestore.collection('users').doc(userData.id).set(userData);
          this.showNotification('User created successfully!', 'success');
        }

        this.dialogRef.close(userData);
      } catch (error: any) {
        console.error('Error saving user:', error);
        this.showNotification(
          error.code === 'auth/email-already-in-use' 
            ? 'Email already exists' 
            : 'Error saving user. Please try again.',
          'error'
        );
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

  // Form getters for easy access in template
  get name() { return this.userForm.get('name'); }
  get email() { return this.userForm.get('email'); }
  get role() { return this.userForm.get('role'); }
  get department() { return this.userForm.get('department'); }
  get phone() { return this.userForm.get('phone'); }
  get password() { return this.userForm.get('password'); }
  get confirmPassword() { return this.userForm.get('confirmPassword'); }
}
