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
  role: 'admin' | 'staff' | 'developer' | 'designer' | 'client';
  department: string;
  phone: string;
  avatar?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  createdByName?: string;
  updatedByName?: string;
  accountStatus: string;
  temporaryPassword?: string;
  activationRequired: boolean;
  activatedAt?: Date;
  firebaseUid?: string;
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
    { value: 'admin', label: 'Administrator', icon: 'admin_panel_settings', color: '#ef4444', description: 'Full system access and user management' },
    { value: 'staff', label: 'Staff', icon: 'badge', color: '#3b82f6', description: 'Regular staff member with standard permissions' },
    { value: 'developer', label: 'Developer', icon: 'code', color: '#10b981', description: 'Software developer with technical access' },
    { value: 'designer', label: 'Designer', icon: 'palette', color: '#f59e0b', description: 'UI/UX designer with design tool access' },
    { value: 'client', label: 'Client', icon: 'person_outline', color: '#8b5cf6', description: 'External client with limited access' }
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
    'Quality Assurance',
    'Administration',
    'Client Services'
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
    
    // Update form validators based on edit mode
    this.updateFormValidators();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['staff', Validators.required],
      department: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      avatar: [''],
      isActive: [true],
      password: [''],
      confirmPassword: ['']
    }, { validators: this.passwordMatchValidator });
  }

  updateFormValidators(): void {
    const passwordControl = this.userForm.get('password');
    const confirmPasswordControl = this.userForm.get('confirmPassword');
    
    if (this.isEditMode) {
      // In edit mode, password is optional
      passwordControl?.setValidators([]);
      confirmPasswordControl?.setValidators([]);
    } else {
      // In create mode, password is required
      passwordControl?.setValidators([Validators.required, Validators.minLength(8)]);
      confirmPasswordControl?.setValidators([Validators.required]);
    }
    
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    // If both passwords are empty (edit mode), validation passes
    if (!password?.value && !confirmPassword?.value) {
      return null;
    }

    // If only one password is filled, validation fails
    if ((password?.value && !confirmPassword?.value) || (!password?.value && confirmPassword?.value)) {
      return { passwordMismatch: true };
    }

    // If both passwords are filled, they must match
    if (password?.value && confirmPassword?.value && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }

    return null;
  }

  loadUserData(user: User): void {
    this.userForm.patchValue({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'staff',
      department: user.department || '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      isActive: user.isActive !== undefined ? user.isActive : true
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
    const role = this.roles.find(r => r.value === roleValue);
    return role ? role.description : 'No description available';
  }

  async onSubmit(): Promise<void> {
    if (this.userForm.valid) {
      this.isLoading = true;
      try {
        const formData = this.userForm.value;
        const currentUser = await this.auth.currentUser;
        
        if (!currentUser) {
          this.showNotification('Admin authentication required', 'error');
          return;
        }

        const userData: User = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          phone: formData.phone,
          avatar: this.previewUrl || formData.avatar,
          isActive: formData.isActive,
          updatedAt: new Date(),
          updatedBy: currentUser.uid,
          updatedByName: currentUser.displayName || currentUser.email || 'Admin',
          accountStatus: 'pending',
          activationRequired: true
        };

        if (!this.isEditMode) {
          // Create user in Firestore without Firebase Auth account
          // The user will need to activate their account later
          const userId = this.firestore.createId(); // Generate unique ID
          
          userData.id = userId;
          userData.createdAt = new Date();
          userData.createdBy = currentUser.uid;
          userData.createdByName = currentUser.displayName || currentUser.email || 'Admin';
          userData.temporaryPassword = formData.password; // Store temporarily (in production, you'd hash this)
          
          // Save user data to Firestore
          await this.firestore.collection('users').doc(userId).set(userData);
          
          // Create activity record for user creation
          await this.firestore.collection('activities').add({
            type: 'user',
            action: 'Created',
            entityId: userId,
            entityName: formData.name,
            details: `New user ${formData.name} (${formData.email}) created with role ${formData.role}. Account activation required.`,
            createdAt: new Date(),
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName || currentUser.email || 'Admin',
            icon: 'person_add'
          });
          
          this.showNotification(`User ${formData.name} created successfully! They will need to activate their account on first login.`, 'success');
          
        } else {
          // Update existing user
          if (this.data.user?.id) {
            // Ensure all required fields have values when updating
            const updateData = {
              ...userData,
              // Preserve existing values for fields that might be undefined
              accountStatus: userData.accountStatus || this.data.user.accountStatus || 'active',
              activationRequired: userData.activationRequired !== undefined ? userData.activationRequired : (this.data.user.activationRequired || false),
              firebaseUid: this.data.user.firebaseUid || null,
              createdAt: this.data.user.createdAt || new Date(),
              createdBy: this.data.user.createdBy || currentUser.uid,
              createdByName: this.data.user.createdByName || (currentUser.displayName || currentUser.email || 'Admin')
            };
            
            // If this is an existing Firebase Auth user, update their profile
            if (this.data.user.firebaseUid) {
              // Note: You can only update the current user's profile in Firebase Auth
              // For other users, you'd need Firebase Admin SDK
              console.log('Note: Firebase Auth profile updates require Admin SDK for other users');
            }
            
            await this.firestore.collection('users').doc(this.data.user.id).update(updateData);
            
            // Create activity record for user update
            await this.firestore.collection('activities').add({
              type: 'user',
              action: 'Updated',
              entityId: this.data.user.id,
              entityName: formData.name || 'Unknown User',
              details: `User ${formData.name || 'Unknown'} (${formData.email || 'Unknown'}) updated`,
              createdAt: new Date(),
              createdBy: currentUser.uid,
              createdByName: currentUser.displayName || currentUser.email || 'Admin',
              icon: 'edit'
            });
            
            this.showNotification('User updated successfully!', 'success');
          }
        }

        this.dialogRef.close(userData);
      } catch (error: any) {
        console.error('Error saving user:', error);
        let errorMessage = 'Error saving user. Please try again.';
        
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please check your access rights.';
        } else if (error.code === 'network-request-failed') {
          errorMessage = 'Network error. Please check your connection.';
        }
        
        this.showNotification(errorMessage, 'error');
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

  // Helper method to activate user account (call this when user first tries to login)
  async activateUserAccount(email: string, password: string): Promise<any> {
    try {
      // This would be called from your login component when a user with pending status tries to log in
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      if (user) {
        // Update the user document with Firebase UID and activate status
        const userQuery = await this.firestore.collection('users', ref => 
          ref.where('email', '==', email).where('accountStatus', '==', 'pending')
        ).get().toPromise();
        
        if (userQuery && !userQuery.empty) {
          const userDoc = userQuery.docs[0];
          const userData = userDoc.data() as User;
          
          await userDoc.ref.update({
            firebaseUid: user.uid,
            accountStatus: 'active',
            activationRequired: false,
            temporaryPassword: null, // Remove temporary password
            activatedAt: new Date()
          });
          
          // Update Firebase Auth profile
          await user.updateProfile({
            displayName: userData.name
          });
          
          return { success: true, user: userData };
        }
      }
      
      return { success: false, error: 'User not found in pending state' };
    } catch (error) {
      console.error('Error activating user account:', error);
      return { success: false, error: error };
    }
  }

  // Debug method to check form validation status
  debugFormValidation(): void {
    console.log('Form valid:', this.userForm.valid);
    console.log('Form errors:', this.userForm.errors);
    console.log('Form values:', this.userForm.value);
    
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      if (control && control.invalid) {
        console.log(`${key} errors:`, control.errors);
      }
    });
  }
}
