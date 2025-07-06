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
    // Set edit mode first
    if (this.data?.user) {
      this.isEditMode = true;
      this.loadUserData(this.data.user);
    }
    
    // Update form validators based on edit mode AFTER determining the mode
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
      password: [''], // No initial validators - will be set in updateFormValidators
      confirmPassword: [''] // No initial validators - will be set in updateFormValidators
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
    
    // Update the entire form validation to reflect the new password validators
    this.userForm.updateValueAndValidity();
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    // Skip validation if we don't have the controls yet
    if (!password || !confirmPassword) {
      return null;
    }

    const passwordValue = password.value;
    const confirmPasswordValue = confirmPassword.value;

    // If both passwords are empty, validation passes (for optional password scenarios)
    if (!passwordValue && !confirmPasswordValue) {
      return null;
    }

    // If only one password is filled, validation fails
    if ((passwordValue && !confirmPasswordValue) || (!passwordValue && confirmPasswordValue)) {
      return { passwordMismatch: true };
    }

    // If both passwords are filled, they must match
    if (passwordValue && confirmPasswordValue && passwordValue !== confirmPasswordValue) {
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
          accountStatus: 'active',
          activationRequired: false
        };

        if (!this.isEditMode) {
          // Create Firebase Auth user first, then use its UID for Firestore document
          try {
            // Create Firebase Auth user using REST API
            const createUserResult = await this.createFirebaseUser(formData.email, formData.password, formData.name);
            
            if (createUserResult.success) {
              // Use Firebase Auth UID as both firebaseUid and document ID
              const firebaseUid = createUserResult.uid;
              
              userData.id = firebaseUid; // Document ID matches Firebase Auth UID
              userData.firebaseUid = firebaseUid;
              userData.createdAt = new Date();
              userData.createdBy = currentUser.uid;
              userData.createdByName = currentUser.displayName || currentUser.email || 'Admin';
              
              // Save user data to Firestore using Firebase Auth UID as document ID
              await this.firestore.collection('users').doc(firebaseUid).set(userData);
              
              // Create activity record for user creation
              await this.firestore.collection('activities').add({
                type: 'user',
                action: 'Created',
                entityId: firebaseUid, // Use Firebase Auth UID as entity ID
                entityName: formData.name,
                details: `New user ${formData.name} (${formData.email}) created with role ${formData.role}. Firebase Auth account created successfully.`,
                createdAt: new Date(),
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName || currentUser.email || 'Admin',
                icon: 'person_add'
              });
              
              this.showNotification(`User ${formData.name} created successfully with Firebase Auth account!`, 'success');
            } else {
              throw new Error(createUserResult.error || 'Failed to create Firebase Auth user');
            }
          } catch (authError: any) {
            console.error('Firebase Auth creation error:', authError);
            
            // Fallback: Create user in Firestore only with pending status
            const fallbackUserId = this.firestore.createId(); // Generate fallback ID only if Firebase Auth fails
            userData.id = fallbackUserId;
            userData.accountStatus = 'pending';
            userData.activationRequired = true;
            userData.temporaryPassword = formData.password;
            userData.createdAt = new Date();
            userData.createdBy = currentUser.uid;
            userData.createdByName = currentUser.displayName || currentUser.email || 'Admin';
            
            await this.firestore.collection('users').doc(fallbackUserId).set(userData);
            
            await this.firestore.collection('activities').add({
              type: 'user',
              action: 'Created',
              entityId: fallbackUserId,
              entityName: formData.name,
              details: `User ${formData.name} (${formData.email}) created in database. Firebase Auth creation failed: ${authError.message}. Manual activation required.`,
              createdAt: new Date(),
              createdBy: currentUser.uid,
              createdByName: currentUser.displayName || currentUser.email || 'Admin',
              icon: 'person_add'
            });
            
            this.showNotification(`User ${formData.name} created in database, but Firebase Auth creation failed. They will need manual activation.`, 'error');
          }
          
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

  // Method to create Firebase Auth user via REST API (preserves admin session)
  async createFirebaseUser(email: string, password: string, displayName: string): Promise<any> {
    try {
      // Use Firebase Auth REST API to create user without affecting current session
      const apiKey = 'AIzaSyD90HQhWSoAELRZ5A5H1Z7j_Grn5QFxCrw'; // Firebase API key
      
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          displayName: displayName,
          returnSecureToken: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Firebase Auth user created successfully:', result);
        return { success: true, uid: result.localId };
      } else {
        const errorData = await response.json();
        console.error('Firebase Auth REST API error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to create Firebase Auth user');
      }
    } catch (error: any) {
      console.error('Error creating Firebase Auth user:', error);
      return { success: false, error: error.message };
    }
  }
}
