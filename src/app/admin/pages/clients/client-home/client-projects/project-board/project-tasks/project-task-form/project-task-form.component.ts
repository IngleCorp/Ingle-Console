import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface ProjectTaskFormData {
  isEditing: boolean;
  task?: any;
  projects: { id: string; name: string; }[];
  assignees: { id: string; name: string; email: string; }[];
  priorities: { value: string; label: string; color: string; }[];
  statuses: { value: string; label: string; color: string; }[];
}

@Component({
  selector: 'app-project-task-form',
  templateUrl: './project-task-form.component.html',
  styleUrls: ['./project-task-form.component.scss']
})
export class ProjectTaskFormComponent implements OnInit {
  taskForm!: FormGroup;
  projectSearchCtrl = new FormControl('');
  filteredProjects!: Observable<{ id: string; name: string; }[]>;

  // Quill editor configuration for rich text description
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image', 'video']
    ]
  };

  quillStyles = {
    height: '200px'
  };

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ProjectTaskFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProjectTaskFormData
  ) {
    this.taskForm = this.createForm();
  }

  ngOnInit(): void {
    this.setupProjectFilter();
    
    if (this.data.isEditing && this.data.task) {
      this.populateForm();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: ['medium', Validators.required],
      status: ['todo', Validators.required],
      assignees: [[]],
      projectId: [''],
      dueDate: [''],
      estimatedHours: ['', [Validators.min(0.1), Validators.max(1000)]],
      tags: ['']
    });
  }

  private setupProjectFilter(): void {
    this.filteredProjects = this.projectSearchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterProjects(value || ''))
    );
  }

  private _filterProjects(value: string): { id: string; name: string; }[] {
    const filterValue = value.toLowerCase();
    return this.data.projects.filter(project => 
      project.name.toLowerCase().includes(filterValue)
    );
  }

  private populateForm(): void {
    const task = this.data.task;
    
    this.taskForm.patchValue({
      title: task.title || task.task || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      assignees: this.getTaskAssigneeIds(task),
      projectId: task.projectId || task.projecttaged || '',
      dueDate: task.dueDate || '',
      estimatedHours: task.estimatedHours || '',
      tags: task.tags ? task.tags.join(', ') : ''
    });

    if (task.projectName || task.projectname) {
      this.projectSearchCtrl.setValue(task.projectName || task.projectname);
    }
  }

  private getTaskAssigneeIds(task: any): string[] {
    if (task.assigns && task.assigns.length > 0) {
      return task.assigns.map((assign: any) => assign.uid || assign.id).filter(Boolean);
    }
    
    if (task.assignees && task.assignees.length > 0) {
      return task.assignees;
    }
    
    return [];
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      
      const result = {
        title: formValue.title,
        description: formValue.description,
        priority: formValue.priority,
        status: formValue.status,
        assignees: formValue.assignees || [],
        projectId: formValue.projectId,
        dueDate: formValue.dueDate,
        estimatedHours: formValue.estimatedHours,
        tags: formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : []
      };

      this.dialogRef.close(result);
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.taskForm.controls).forEach(key => {
      const control = this.taskForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.taskForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.taskForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} must be at most ${field.errors['max'].max}`;
    }
    return '';
  }

  displayProjectFn(project: { id: string; name: string; }): string {
    return project ? project.name : '';
  }

  onProjectSelected(project: { id: string; name: string; }): void {
    this.taskForm.patchValue({ projectId: project.id });
  }
}
