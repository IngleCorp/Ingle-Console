import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
// import { NgxSpinnerService } from 'ngx-spinner'; // Uncomment if available
import { GeneralService } from '../../../../core/services/general.service';
// import { ConfirmBoxComponent } from '...'; // Uncomment or update if available
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-client-add',
  templateUrl: './client-add.component.html',
  styleUrls: ['./client-add.component.scss']
})
export class ClientAddComponent implements OnInit {
  clientForm: FormGroup;
  isSubmitting = false;
  isUploading = false;
  uploadProgress = 0;
  
  // Allowed image types
  allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(
    public dialogRef: MatDialogRef<ClientAddComponent>,
    private fb: FormBuilder,
    private afs: AngularFirestore,
    private storage: AngularFireStorage,
    private service: GeneralService,
    // private spinner: NgxSpinnerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.clientForm = this.createForm();
  }

  ngOnInit(): void {}

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: [''],
      address: [''],
      city: [''],
      state: [''],
      zip: [''],
      country: [''],
      notes: [''],
      image: [''],
      createdAt: [new Date()],
      createdBy: [localStorage.getItem('userid') || ''],
      createdByName: [localStorage.getItem('username') || 'Unknown User']
    });
  }

  onSubmit(): void {
    // Placeholder for form submit logic
  }

  close(): void {
    this.dialogRef.close();
  }

  addClient(): void {
    if (this.clientForm.invalid) {
      this.markFormGroupTouched(this.clientForm);
      this.showNotification('Please fill in all required fields correctly', 'error');
      return;
    }

    this.isSubmitting = true;
    const clientData = this.clientForm.value;

    this.afs.collection('clients').add(clientData)
      .then((docRef) => {
        // Record activity
        this.afs.collection('activities').add({
          type: 'client',
          action: 'Created',
          entityId: docRef.id,
          entityName: clientData.name,
          details: `New client created: ${clientData.name}`,
          createdAt: new Date(),
          createdBy: localStorage.getItem('userid') || '',
          createdByName: localStorage.getItem('username') || 'Unknown User',
          icon: 'group_add'
        });

        this.showNotification('Client created successfully!', 'success');
        this.dialogRef.close({ success: true, clientId: docRef.id });
      })
      .catch((error) => {
        console.error('Error creating client:', error);
        this.showNotification('Error creating client. Please try again.', 'error');
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  uploadFile(event: any): void {
    const file = event.target.files[0];
    
    if (!file) {
      this.showNotification('No file selected', 'error');
      return;
    }

    // Validate file type
    if (!this.allowedImageTypes.includes(file.type)) {
      this.showNotification('Please select a valid image file (JPEG, PNG, GIF, WebP)', 'error');
      return;
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      this.showNotification('File size must be less than 5MB', 'error');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    // Create a unique file path for client avatars
    const timestamp = Date.now();
    const filePath = `clients/temp/${timestamp}_${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, file);

    uploadTask.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe({
          next: (downloadURL) => {
            this.clientForm.patchValue({ image: downloadURL });
            this.isUploading = false;
            this.uploadProgress = 0;
            this.showNotification('Image uploaded successfully', 'success');
          },
          error: (error) => {
            console.error('Error getting download URL:', error);
            this.isUploading = false;
            this.uploadProgress = 0;
            this.showNotification('Error uploading image', 'error');
          }
        });
      })
    ).subscribe({
      next: (snapshot) => {
        if (snapshot) {
          this.uploadProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.isUploading = false;
        this.uploadProgress = 0;
        this.showNotification('Error uploading image', 'error');
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
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

  // Helper method to get field errors
  getFieldError(fieldName: string): string {
    const field = this.clientForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['email']) return 'Please enter a valid email address';
    }
    return '';
  }
}
