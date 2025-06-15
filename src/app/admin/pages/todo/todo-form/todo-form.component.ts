import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-todo-form',
  templateUrl: './todo-form.component.html',
  styleUrl: './todo-form.component.scss'
})
export class TodoFormComponent implements OnInit {
  form!: FormGroup;
  users: string[] = [];
  labels: string[] = [];
  statuses = ['todo', 'inprogress', 'completed', 'hold'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TodoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.users = data.users || [];
    this.labels = data.labels || [];
  }

  ngOnInit() {
    this.form = this.fb.group({
      title: [this.data.task?.title || '', Validators.required],
      description: [this.data.task?.description || '', Validators.required],
      labels: [this.data.task?.labels ? this.data.task.labels.join(', ') : ''],
      assignees: [this.data.task?.assignees ? this.data.task.assignees.join(', ') : ''],
      status: [this.data.task?.status || 'todo', Validators.required],
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const value = this.form.value;
      this.dialogRef.close({
        title: value.title,
        description: value.description,
        labels: value.labels ? value.labels.split(',').map((l: string) => l.trim()).filter((l: string) => l) : [],
        assignees: value.assignees ? value.assignees.split(',').map((a: string) => a.trim()).filter((a: string) => a) : [],
        status: value.status
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
