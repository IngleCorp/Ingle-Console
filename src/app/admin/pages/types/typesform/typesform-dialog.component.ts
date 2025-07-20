import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface Type {
  id?: string;
  name: string;
  category: 'EXPENSE' | 'INCOME';
  position: number;
  is_active: boolean;
  is_deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  createdByName?: string;
}

export interface TypeDialogData {
  category: 'EXPENSE' | 'INCOME';
}

@Component({
  selector: 'app-typesform-dialog',
  templateUrl: './typesform-dialog.component.html',
  styleUrls: ['./typesform-dialog.component.scss']
})
export class TypesformDialogComponent implements OnInit {
  typesForm: FormGroup;
  loading: boolean = false;
  
  categories: { value: string; label: string; icon: string }[] = [
    { value: 'EXPENSE', label: 'Expense', icon: 'remove_circle' },
    { value: 'INCOME', label: 'Income', icon: 'add_circle' }
  ];

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<TypesformDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TypeDialogData
  ) {
    this.typesForm = this.createForm();
  }

  ngOnInit(): void {
    this.setDefaultValues();
  }

  private createForm(): FormGroup {
    return new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50)
      ]),
      category: new FormControl('', [Validators.required]),
      position: new FormControl('', [
        Validators.required,
        Validators.min(1),
        Validators.max(999)
      ]),
      is_active: new FormControl(true),
      is_deleted: new FormControl(false)
    });
  }

  private setDefaultValues(): void {
    // Set the category from the dialog data
    this.typesForm.patchValue({
      category: this.data.category,
      is_active: true,
      is_deleted: false
    });

    // Get the next position number
    this.getNextPosition().then(position => {
      this.typesForm.patchValue({
        position: position
      });
    });
  }

  private async getNextPosition(): Promise<number> {
    try {
      const snapshot = await this.firestore.collection('types', ref => 
        ref.orderBy('position', 'desc').limit(1)
      ).get().toPromise();
      
      if (snapshot && !snapshot.empty) {
        const lastType = snapshot.docs[0].data() as Type;
        return (lastType.position || 0) + 1;
      }
      return 1;
    } catch (error) {
      console.error('Error getting next position:', error);
      return 1;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.typesForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    try {
      const user = await this.auth.currentUser;
      const formData = this.typesForm.value;

      // Create new type
      const typeData: Type = {
        ...formData,
        createdAt: new Date(),
        createdBy: user?.uid,
        createdByName: user?.displayName || user?.email || 'Unknown User',
        updatedAt: new Date()
      };

      const docRef = await this.firestore.collection('types').add(typeData);

      // Create activity record
      if (user) {
        await this.firestore.collection('activities').add({
          type: 'type',
          action: 'Created',
          entityId: docRef.id,
          entityName: formData.name,
          details: `New type "${formData.name}" created`,
          createdAt: new Date(),
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Unknown User',
          icon: 'add'
        });
      }

      this.showNotification('Type created successfully!', 'success');
      
      // Return the created type data to the parent component
      this.dialogRef.close({
        success: true,
        type: {
          id: docRef.id,
          ...typeData
        }
      });
    } catch (error) {
      console.error('Error saving type:', error);
      this.showNotification('Error saving type', 'error');
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'EXPENSE':
        return 'remove_circle';
      case 'INCOME':
        return 'add_circle';
      default:
        return 'category';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.typesForm.controls).forEach(key => {
      const control = this.typesForm.get(key);
      control?.markAsTouched();
    });
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? 'success-snackbar' : 'error-snackbar'
    });
  }

  // Getters for form controls (for easier template access)
  get name(): FormControl {
    return this.typesForm.get('name') as FormControl;
  }

  get category(): FormControl {
    return this.typesForm.get('category') as FormControl;
  }

  get position(): FormControl {
    return this.typesForm.get('position') as FormControl;
  }

  get is_active(): FormControl {
    return this.typesForm.get('is_active') as FormControl;
  }

  get is_deleted(): FormControl {
    return this.typesForm.get('is_deleted') as FormControl;
  }
} 