import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GeneralService } from '../../../../../core/services/general.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-info',
  templateUrl: './client-info.component.html',
  styleUrls: ['./client-info.component.scss']
})
export class ClientInfoComponent implements OnInit, OnDestroy {
  clientId: string | null = null;
  clientInfo: any;
  editmode: string = '';
  username: string = '';
  password: string = '';
  is_clientLoginExist: boolean = false;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  key: string = 'KKiHHHTsayys7sjlllss6789012kkkks3456';
  passwordKey: string = 'YiHHHvvvvYtyytghsbjysees7890jjj12kkkks3456';
  
  // Allowed image types
  allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  maxFileSize = 5 * 1024 * 1024; // 5MB
  
  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private afs: AngularFirestore, 
    private storage: AngularFireStorage,
    private route: ActivatedRoute, 
    private snackBar: MatSnackBar,
    private service: GeneralService
  ) { }

  ngOnInit(): void {
    // Listen for route parameter changes
    this.route.parent?.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.clientId = params.get('id');
      console.log('Client-info component: Client ID changed to:', this.clientId);
      this.loadClientData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadClientData(): void {
    if (!this.clientId) return;
    this.getClientInfo();
    this.getClientLoginInfo();
  }

  getClientInfo(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.clientInfo = res;
      });
  }

  getClientLoginInfo(): void {
    if (!this.clientId) return;
    this.afs.collection('client-login').doc(this.clientId).valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        try {
          if (res && res.password) {
            let decrypted = this.decryptText(res.password, this.key);
            this.password = decrypted;
            this.username = res.userid || '';
            this.is_clientLoginExist = true;
          } else {
            this.password = '';
            this.username = '';
            this.is_clientLoginExist = false;
          }
        } catch (error) {
          console.error('Error processing client login info:', error);
          this.password = '';
          this.username = '';
          this.is_clientLoginExist = false;
        }
      }, (error) => {
        console.error('Error fetching client login info:', error);
        this.password = '';
        this.username = '';
        this.is_clientLoginExist = false;
      });
  }

  updateClientInfo(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).update(this.clientInfo).then(() => {
      this.editmode = '';
      this.showNotification('Client information updated successfully', 'success');
    }).catch(err => {
      console.error('Error updating client info:', err);
      this.showNotification('Error updating client information', 'error');
    });
  }

  updateClientLoginInfo(): void {
    if (!this.clientId) return;
    let password = '';
    if (this.password) {
      password = this.encryptText(this.password, this.key);
    }
    let data = {
      userid: this.username,
      clientid: this.clientId,
      password: password
    };
    if (this.is_clientLoginExist) {
      this.afs.collection('client-login').doc(this.clientId).update(data).then(() => {
        this.editmode = '';
        this.showNotification('Login information updated successfully', 'success');
      }).catch(err => {
        console.error('Error updating login info:', err);
        this.showNotification('Error updating login information', 'error');
      });
    } else {
      this.afs.collection('client-login').doc(this.clientId).set(data).then(() => {
        this.editmode = '';
        this.showNotification('Login information created successfully', 'success');
      }).catch(err => {
        console.error('Error adding document: ', err);
        this.showNotification('Error creating login information', 'error');
      });
    }
  }

  updateCLientCreatedAt(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).update({ createdAt: new Date() }).then(() => {
      this.editmode = '';
      this.showNotification('Client creation date updated', 'success');
    }).catch(err => {
      console.error('Error updating creation date:', err);
      this.showNotification('Error updating creation date', 'error');
    });
  }

  decryptText(text: string, key: string): string {
    if (!text || !key) {
      return '';
    }
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      let charCode = text.charCodeAt(i);
      let keyChar = key.charCodeAt(i % key.length);
      let decryptedChar = charCode ^ keyChar;
      result += String.fromCharCode(decryptedChar);
    }
    return result;
  }

  encryptText(text: string, key: string): string {
    if (!text || !key) {
      return '';
    }
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      let charCode = text.charCodeAt(i);
      let keyChar = key.charCodeAt(i % key.length);
      let encryptedChar = charCode ^ keyChar;
      result += String.fromCharCode(encryptedChar);
    }
    return result;
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

    if (!this.clientId) {
      this.showNotification('Client ID not found', 'error');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    // Create a unique file path for client avatars
    const filePath = `clients/${this.clientId}/avatar/${Date.now()}_${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, file);

    uploadTask.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe({
          next: (downloadURL) => {
            // Update client info with new image URL
            this.clientInfo.image = downloadURL;
            this.updateClientInfo();
            
            // Also update the file reference for future deletion if needed
            if (this.clientId) {
              this.afs.collection('clients').doc(this.clientId).update({
                image: downloadURL,
                imageRef: filePath,
                imageUpdatedAt: new Date()
              }).then(() => {
                this.isUploading = false;
                this.uploadProgress = 0;
                this.showNotification('Profile picture updated successfully', 'success');
              }).catch((error: any) => {
                console.error('Error updating image reference:', error);
                this.isUploading = false;
                this.uploadProgress = 0;
                this.showNotification('Profile picture updated but reference not saved', 'warning');
              });
            } else {
              this.isUploading = false;
              this.uploadProgress = 0;
              this.showNotification('Profile picture updated successfully', 'success');
            }
          },
          error: (error: any) => {
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

    // Reset file input
    event.target.value = '';
  }

  // Helper method to show notifications
  showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? ['success-snackbar'] : 
                  type === 'error' ? ['error-snackbar'] : 
                  ['warning-snackbar']
    });
  }

  // Helper method to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper method to get file extension
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
}
