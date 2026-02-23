import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';

const OWN_PROJECTS_COLLECTION = 'ownProjects';

export interface OwnProjectFormData {
  projectId?: string;
  projectData?: any;
}

@Component({
  selector: 'app-own-project-form',
  templateUrl: './own-project-form.component.html',
  styleUrls: ['./own-project-form.component.scss']
})
export class OwnProjectFormComponent {
  projectForm!: FormGroup;
  isLoading = false;
  isEditMode = false;

  statuses = [
    { value: 'active', label: 'Active', icon: 'play_circle' },
    { value: 'pending', label: 'Pending', icon: 'schedule' },
    { value: 'completed', label: 'Completed', icon: 'check_circle' },
    { value: 'on-hold', label: 'On Hold', icon: 'pause_circle' },
    { value: 'building', label: 'Building', icon: 'build' },
    { value: 'launching', label: 'Launching', icon: 'launch' },
    { value: 'launched', label: 'Launched', icon: 'launch' },
    { value: 'archived', label: 'Archived', icon: 'archive' },
    { value: 'cancelled', label: 'Cancelled', icon: 'cancel' },
    {value:'mvp',label:'MVP',icon:'m'},
    {value:'ideation',label:'Ideation',icon:'idea'},
    {value:'development',label:'Development',icon:'code'},
    {value:'testing',label:'Testing',icon:'test'},
    {value:'deployment',label:'Deployment',icon:'deploy'},
    {value:'maintenance',label:'Maintenance',icon:'maintenance'},
    {value:'other',label:'Other',icon:'other'},
    {value:'research',label:'Research',icon:'research'},
    {value:'design',label:'Design',icon:'design'},
    {value:'marketing',label:'Marketing',icon:'marketing'},
    {value:'sales',label:'Sales',icon:'sales'},
    {value:'customer-support',label:'Customer Support',icon:'customer-support'},
    {value:'product-management',label:'Product Management',icon:'product-management'},
    {value:'quality-assurance',label:'Quality Assurance',icon:'quality-assurance'},
    {value:'administration',label:'Administration',icon:'administration'},
    {value:'client-services',label:'Client Services',icon:'client-services'},

  
  ];

  types = [
    { value: 'product', label: 'Product' },
    { value: 'internal-tool', label: 'Internal Tool' },
    { value: 'ideation', label: 'Ideation' },
    { value: 'development', label: 'Development' },
    { value: 'other', label: 'Other' }
  ];

  priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<OwnProjectFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OwnProjectFormData,
    private afs: AngularFirestore,
    private snackBar: MatSnackBar
  ) {
    this.isEditMode = !!data?.projectId;
    this.initForm();
    if (this.isEditMode && data?.projectData) {
      this.patchForm(data.projectData);
    }
  }

  private initForm(): void {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      type: ['', [Validators.required]],
      status: ['active', [Validators.required]],
      priority: ['medium', [Validators.required]],
      startDate: [''],
      endDate: [''],
      progress: [0, [Validators.min(0), Validators.max(100)]],
      notes: ['', [Validators.maxLength(1000)]]
    });
  }

  private patchForm(d: any): void {
    this.projectForm.patchValue({
      name: d.name || '',
      description: d.description || '',
      type: d.type || '',
      status: d.status || 'active',
      priority: d.priority || 'medium',
      startDate: d.startDate ? (d.startDate?.toDate ? d.startDate.toDate() : new Date(d.startDate.seconds * 1000)) : '',
      endDate: d.endDate ? (d.endDate?.toDate ? d.endDate.toDate() : new Date(d.endDate.seconds * 1000)) : '',
      progress: d.progress ?? 0,
      notes: d.notes || ''
    });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.markAllTouched();
      this.snackBar.open('Please fill required fields', 'Close', { duration: 3000 });
      return;
    }
    this.isLoading = true;
    const v = this.projectForm.value;
    const payload = {
      name: v.name,
      description: v.description || '',
      type: v.type,
      status: v.status,
      priority: v.priority,
      startDate: v.startDate || null,
      endDate: v.endDate || null,
      progress: v.progress ?? 0,
      notes: v.notes || '',
      updatedAt: new Date(),
      updatedBy: localStorage.getItem('userid') || '',
      updatedByName: localStorage.getItem('username') || 'Unknown'
    };
    if (this.isEditMode && this.data?.projectId) {
      this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.data.projectId).update(payload)
        .then(() => {
          this.snackBar.open('Project updated', 'Close', { duration: 3000 });
          this.dialogRef.close({ success: true, projectId: this.data.projectId, action: 'updated' });
        })
        .catch(err => {
          this.snackBar.open('Update failed', 'Close', { duration: 3000 });
        })
        .finally(() => { this.isLoading = false; });
    } else {
      (payload as any).createdAt = new Date();
      (payload as any).createdBy = localStorage.getItem('userid') || '';
      (payload as any).createdByName = localStorage.getItem('username') || 'Unknown';
      this.afs.collection(OWN_PROJECTS_COLLECTION).add(payload)
        .then(docRef => {
          this.snackBar.open('Project created', 'Close', { duration: 3000 });
          this.dialogRef.close({ success: true, projectId: docRef.id, action: 'created' });
        })
        .catch(err => {
          this.snackBar.open('Create failed', 'Close', { duration: 3000 });
        })
        .finally(() => { this.isLoading = false; });
    }
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  private markAllTouched(): void {
    Object.keys(this.projectForm.controls).forEach(k => this.projectForm.get(k)?.markAsTouched());
  }

  getError(field: string): string {
    const c = this.projectForm.get(field);
    if (!c?.errors || !c.touched) return '';
    if (c.errors['required']) return 'Required';
    if (c.errors['minlength']) return `Min ${c.errors['minlength'].requiredLength} characters`;
    if (c.errors['maxlength']) return `Max ${c.errors['maxlength'].requiredLength} characters`;
    if (c.errors['min']) return `Min value ${c.errors['min'].min}`;
    if (c.errors['max']) return `Max value ${c.errors['max'].max}`;
    return '';
  }
}
