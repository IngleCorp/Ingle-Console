import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Task, TaskAssignee, Project } from '../tasks.component';

export interface TaskViewData {
  task: Task;
  assignees: TaskAssignee[];
  projects: Project[];
  priorities: { value: string; label: string; color: string; }[];
  statuses: { value: string; label: string; color: string; }[];
}

@Component({
  selector: 'app-task-view',
  templateUrl: './task-view.component.html',
  styleUrls: ['./task-view.component.scss']
})
export class TaskViewComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<TaskViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskViewData
  ) {}

  ngOnInit(): void {
    // Component initialization logic
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', task: this.data.task });
  }

  onDelete(): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.dialogRef.close({ action: 'delete', task: this.data.task });
    }
  }

  // Helper methods
  getTaskTitle(): string {
    return this.data.task.title || this.data.task.task || 'Untitled Task';
  }

  getTaskDescription(): string {
    return this.data.task.description || '';
  }

  getTaskAssignees(): string[] {
    if (this.data.task.assigns && this.data.task.assigns.length > 0) {
      return this.data.task.assigns.map(assign => assign.name || 'Unknown');
    }
    
    if (this.data.task.assignees && this.data.task.assignees.length > 0) {
      return this.getAssigneeNames(this.data.task.assignees);
    }
    
    return [];
  }

  getAssigneeNames(assigneeIds: string[]): string[] {
    return assigneeIds.map(id => 
      this.data.assignees.find(a => a.id === id)?.name || id
    );
  }

  getProjectName(): string {
    const projectId = this.data.task.projectId || this.data.task.projecttaged;
    if (!projectId) return '';
    
    const project = this.data.projects.find(p => p.id === projectId);
    return project?.name || projectId;
  }

  getPriorityInfo(): { label: string; color: string } {
    const priority = this.data.task.priority || 'medium';
    const priorityObj = this.data.priorities.find(p => p.value === priority);
    return {
      label: priorityObj?.label || 'Medium',
      color: priorityObj?.color || '#f59e0b'
    };
  }

  getStatusInfo(): { label: string; color: string } {
    const status = this.data.task.status || 'todo';
    const statusObj = this.data.statuses.find(s => s.value === status);
    return {
      label: statusObj?.label || 'To Do',
      color: statusObj?.color || '#6b7280'
    };
  }

  getCreatedBy(): string {
    return this.data.task.createdByName || this.data.task.createdby || this.data.task.createdBy || 'Unknown User';
  }

  getUpdatedBy(): string {
    return this.data.task.updatedByName || this.data.task.updatedBy || '';
  }
}