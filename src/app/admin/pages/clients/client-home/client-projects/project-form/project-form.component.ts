import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ProjectFormData {
  clientId: string;
  clientName: string;
  projectId?: string; // For editing existing project
  projectData?: any; // For editing existing project
}

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit {
  projectForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  
  projectStatuses = [
    { value: 'active', label: 'Active', icon: 'play_circle' },
    { value: 'pending', label: 'Pending', icon: 'schedule' },
    { value: 'completed', label: 'Completed', icon: 'check_circle' },
    { value: 'on-hold', label: 'On Hold', icon: 'pause_circle' }
  ];

  projectTypes = [
    { value: 'web-development', label: 'Web Development' },
    { value: 'mobile-app', label: 'Mobile App' },
    { value: 'design', label: 'Design' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' }
  ];

  priorities = [
    { value: 'low', label: 'Low', color: '#4caf50' },
    { value: 'medium', label: 'Medium', color: '#ff9800' },
    { value: 'high', label: 'High', color: '#f44336' },
    { value: 'urgent', label: 'Urgent', color: '#e91e63' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProjectFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProjectFormData,
    private afs: AngularFirestore,
    private snackBar: MatSnackBar
  ) {
    this.isEditMode = !!data.projectId;
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.projectData) {
      this.populateForm(this.data.projectData);
    }
  }

  private initializeForm(): void {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      type: ['', [Validators.required]],
      status: ['active', [Validators.required]],
      priority: ['medium', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: [''],
      budget: ['', [Validators.min(0)]],
      progress: [0, [Validators.min(0), Validators.max(100)]],
      tags: [''],
      notes: ['', [Validators.maxLength(1000)]],
      clientContact: [''],
      projectManager: [''],
      estimatedHours: ['', [Validators.min(0)]]
    });
  }

  private populateForm(projectData: any): void {
    this.projectForm.patchValue({
      name: projectData.name || '',
      description: projectData.description || '',
      type: projectData.type || '',
      status: projectData.status || 'active',
      priority: projectData.priority || 'medium',
      startDate: projectData.startDate ? new Date(projectData.startDate.seconds * 1000) : '',
      endDate: projectData.endDate ? new Date(projectData.endDate.seconds * 1000) : '',
      budget: projectData.budget || '',
      progress: projectData.progress || 0,
      tags: projectData.tags || '',
      notes: projectData.notes || '',
      clientContact: projectData.clientContact || '',
      projectManager: projectData.projectManager || '',
      estimatedHours: projectData.estimatedHours || ''
    });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.markFormGroupTouched();
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }

    this.isLoading = true;
    const formData = this.projectForm.value;
    
    const projectData = {
      ...formData,
      clientid: this.data.clientId,
      clientName: this.data.clientName,
      createdAt: this.isEditMode ? undefined : new Date(),
      updatedAt: new Date(),
      createdBy: this.isEditMode ? undefined : localStorage.getItem('userid') || '',
      createdByName: this.isEditMode ? undefined : localStorage.getItem('username') || 'Unknown User',
      updatedBy: localStorage.getItem('userid') || '',
      updatedByName: localStorage.getItem('username') || 'Unknown User',
      tags: formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()) : []
    };

    if (this.isEditMode) {
      this.updateProject(projectData);
    } else {
      this.createProject(projectData);
    }
  }

  private createProject(projectData: any): void {
    this.afs.collection('projects').add(projectData).then((docRef) => {
      // Record activity for project creation
      this.afs.collection('activities').add({
        type: 'project',
        action: 'Created',
        entityId: docRef.id,
        entityName: projectData.name,
        details: `New project created: ${projectData.name} for client ${projectData.clientName}`,
        createdAt: new Date(),
        createdBy: localStorage.getItem('userid') || '',
        createdByName: localStorage.getItem('username') || 'Unknown User',
        icon: 'folder_open',
        clientId: this.data.clientId,
        projectId: docRef.id
      });

      this.showNotification('Project created successfully!', 'success');
      this.dialogRef.close({ success: true, projectId: docRef.id, action: 'created' });
    }).catch((error) => {
      console.error('Error creating project:', error);
      this.showNotification('Error creating project. Please try again.', 'error');
    }).finally(() => {
      this.isLoading = false;
    });
  }

  private updateProject(projectData: any): void {
    if (!this.data.projectId) return;

    this.afs.collection('projects').doc(this.data.projectId).update(projectData).then(() => {
      // Record activity for project update
      this.afs.collection('activities').add({
        type: 'project',
        action: 'Updated',
        entityId: this.data.projectId,
        entityName: projectData.name,
        details: `Project updated: ${projectData.name}`,
        createdAt: new Date(),
        createdBy: localStorage.getItem('userid') || '',
        createdByName: localStorage.getItem('username') || 'Unknown User',
        icon: 'edit',
        clientId: this.data.clientId,
        projectId: this.data.projectId
      });

      this.showNotification('Project updated successfully!', 'success');
      this.dialogRef.close({ success: true, projectId: this.data.projectId, action: 'updated' });
    }).catch((error) => {
      console.error('Error updating project:', error);
      this.showNotification('Error updating project. Please try again.', 'error');
    }).finally(() => {
      this.isLoading = false;
    });
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.projectForm.controls).forEach(key => {
      const control = this.projectForm.get(key);
      control?.markAsTouched();
    });
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

  // Helper methods for template
  getFieldError(fieldName: string): string {
    const control = this.projectForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
      if (control.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${control.errors['maxlength'].requiredLength} characters`;
      }
      if (control.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Project Name',
      description: 'Description',
      type: 'Project Type',
      status: 'Status',
      priority: 'Priority',
      startDate: 'Start Date',
      endDate: 'End Date',
      budget: 'Budget',
      progress: 'Progress',
      tags: 'Tags',
      notes: 'Notes',
      clientContact: 'Client Contact',
      projectManager: 'Project Manager',
      estimatedHours: 'Estimated Hours'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.projectForm.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return '#4caf50';
    if (progress >= 50) return '#ff9800';
    return '#f44336';
  }
} 