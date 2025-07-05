import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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

@Component({
  selector: 'app-typesform',
  templateUrl: './typesform.component.html',
  styleUrls: ['./typesform.component.scss']
})
export class TypesformComponent implements OnInit, OnDestroy {
  typesForm: FormGroup;
  loading: boolean = false;
  isEditing: boolean = false;
  typeId: string | null = null;
  currentType: Type | null = null;
  
  categories: { value: string; label: string; icon: string }[] = [
    { value: 'EXPENSE', label: 'Expense', icon: 'remove_circle' },
    { value: 'INCOME', label: 'Income', icon: 'add_circle' }
  ];

  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private snackBar: MatSnackBar
  ) {
    this.typesForm = this.createForm();
  }

  ngOnInit(): void {
    // Check if we're editing an existing type
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.typeId = params['id'];
        this.isEditing = true;
        this.loadTypeData();
      } else {
        this.isEditing = false;
        this.setDefaultValues();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    // Get the next position number
    this.getNextPosition().then(position => {
      this.typesForm.patchValue({
        position: position,
        is_active: true,
        is_deleted: false
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

  private loadTypeData(): void {
    if (!this.typeId) return;

    this.loading = true;
    this.firestore.collection('types').doc(this.typeId).valueChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        if (data) {
          this.currentType = data;
          this.typesForm.patchValue({
            name: data.name,
            category: data.category,
            position: data.position,
            is_active: data.is_active,
            is_deleted: data.is_deleted
          });
        } else {
          this.showNotification('Type not found', 'error');
          this.router.navigate(['/admin/types']);
        }
        this.loading = false;
      }, (error) => {
        console.error('Error loading type:', error);
        this.showNotification('Error loading type', 'error');
        this.loading = false;
      });
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

      if (this.isEditing && this.typeId) {
        // Update existing type
        const updateData = {
          ...formData,
          updatedAt: new Date(),
          updatedBy: user?.uid,
          updatedByName: user?.displayName || user?.email || 'Unknown User'
        };

        await this.firestore.collection('types').doc(this.typeId).update(updateData);

        // Create activity record
        if (user) {
          await this.firestore.collection('activities').add({
            type: 'type',
            action: 'Updated',
            entityId: this.typeId,
            entityName: formData.name,
            details: `Type "${formData.name}" updated`,
            createdAt: new Date(),
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'Unknown User',
            icon: 'edit'
          });
        }

        this.showNotification('Type updated successfully!', 'success');
      } else {
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
      }

      // Navigate back to types list
      this.router.navigate(['/admin/types']);
    } catch (error) {
      console.error('Error saving type:', error);
      this.showNotification('Error saving type', 'error');
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/types']);
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
   




