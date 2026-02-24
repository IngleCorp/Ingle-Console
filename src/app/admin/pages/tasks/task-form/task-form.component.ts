import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Project, Task, TaskAssignee } from '../tasks.component';
import { FormControl } from '@angular/forms';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface TaskFormData {
  isEditing: boolean;
  task?: Task;
  projects: Project[];
  assignees: TaskAssignee[];
  priorities: { value: string; label: string; color: string; }[];
  statuses: { value: string; label: string; color: string; }[];
}

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit {
  taskForm: FormGroup;
  projectSearchCtrl = new FormControl('');
  filteredProjects: Observable<Project[]>;

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
    public dialogRef: MatDialogRef<TaskFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskFormData
  ) {
    this.taskForm = this.createForm();
    this.filteredProjects = this.projectSearchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterProjects(value || ''))
    );
  }

  ngOnInit(): void {
    if (this.data.isEditing && this.data.task) {
      this.taskForm.patchValue({
        ...this.data.task,
        // Ensure assignee IDs are correctly patched
        assignees: this.data.task.assignees || []
      });
    }
  }

  get isOwnProjectTask(): boolean {
    const t: any = this.data.task;
    return !!t && (t.category === 'ownProject' || t.source === 'ownProject') && !!t.ownProjectId;
  }

  get ownProjectTaskLink(): string | null {
    if (!this.isOwnProjectTask) return null;
    const t: any = this.data.task;
    const projectId = t.ownProjectId;
    const ownTaskId = t.ownProjectTaskId;
    return ownTaskId
      ? `/admin/own-projects/${projectId}/tasks/${ownTaskId}`
      : `/admin/own-projects/${projectId}/tasks`;
  }

  get isClientProjectTask(): boolean {
    const t: any = this.data.task;
    return !!t && (t.category === 'clientProject' || !!t.clientId) && !!t.clientId && !!(t.projectId || t.projecttaged);
  }

  get clientProjectTaskLink(): string | null {
    if (!this.isClientProjectTask) return null;
    const t: any = this.data.task;
    const clientId = t.clientId;
    const projectId = t.projectId || t.projecttaged;
    return clientId && projectId
      ? `/admin/clients/${clientId}/projects/${projectId}/tasks`
      : null;
  }

  private _filterProjects(value: string): Project[] {
    const filterValue = value.toLowerCase();
    return this.data.projects.filter(project => project.name.toLowerCase().includes(filterValue));
  }

  createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: ['medium', Validators.required],
      status: ['todo', Validators.required],
      assignees: [[]],
      projectId: [null],
      dueDate: [''],
      estimatedHours: [''],
      tags: [[]],
      isActive: [true]
    });
  }

  onSave(): void {
    if (this.taskForm.valid) {
      this.dialogRef.close(this.taskForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
