import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Task, TaskAssignee, Project } from '../tasks.component';

@Component({
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.scss']
})
export class TaskDetailsComponent implements OnInit {
  task: Task | null = null;
  isLoading = true;
  notFound = false;

  /** Which field is currently being edited (click + focus); blur saves */
  editingField: 'title' | 'description' | null = null;
  editTitleValue = '';
  editDescValue = '';

  assignees: TaskAssignee[] = [
    { id: '1', name: 'Jasmal', email: 'jasmal@example.com' },
    { id: '2', name: 'Ramshin', email: 'ramshin@example.com' },
    { id: '3', name: 'Ajmal', email: 'ajmal@example.com' }
  ];
  projects: Project[] = [];
  priorities = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#ef4444' },
    { value: 'urgent', label: 'Urgent', color: '#dc2626' }
  ];
  statuses = [
    { value: 'todo', label: 'To Do', color: '#6b7280' },
    { value: 'in-progress', label: 'In Progress', color: '#3b82f6' },
    { value: 'done', label: 'Done', color: '#10b981' },
    { value: 'hold', label: 'On Hold', color: '#f59e0b' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: AngularFirestore,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }
    this.loadProjects();
    this.loadTask(id);
  }

  private loadProjects(): void {
    this.firestore.collection('projects').valueChanges({ idField: 'id' }).subscribe((projects: any) => {
      this.projects = projects;
    });
  }

  private loadTask(id: string): void {
    this.isLoading = true;
    this.notFound = false;
    this.firestore.collection('tasks').doc(id).get().subscribe({
      next: (doc) => {
        if (doc.exists) {
          const raw = (doc.data() || {}) as any;
          this.task = this.transformLegacyTask({ id: doc.id, ...raw });
        } else {
          this.task = null;
          this.notFound = true;
        }
        this.isLoading = false;
      },
      error: () => {
        this.task = null;
        this.notFound = true;
        this.isLoading = false;
        this.showNotification('Error loading task', 'error');
      }
    });
  }

  private convertTimestampToDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private transformLegacyTask(task: any): Task {
    return {
      ...task,
      title: task.title || task.task || task.req_id_name,
      task: task.task || task.title || task.req_id_name || 'Untitled Task',
      description: task.description || task.remarks,
      assignees: task.assignees || (task.assigns ? task.assigns.map((a: any) => a.uid) : []),
      projectId: task.projectId || task.projecttaged,
      createdByName: task.createdByName || task.createdby || task.createdBy,
      createdBy: task.createdBy || task.createdbyid,
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      progress: task.progress ?? 0,
      isActive: task.isActive !== false,
      createdAt: this.convertTimestampToDate(task.createdAt) || new Date(),
      updatedAt: this.convertTimestampToDate(task.updatedAt) ?? undefined,
      dueDate: this.convertTimestampToDate(task.dueDate) ?? undefined,
      tags: task.tags || [],
      assigns: task.assigns,
      projecttaged: task.projecttaged,
      createdby: task.createdby,
      createdbyid: task.createdbyid,
      category: task.category || (task.source === 'ownProject' ? 'ownProject' : (task.clientId ? 'clientProject' : 'general'))
    } as Task;
  }

  getTaskTitle(): string {
    return this.task?.title || this.task?.task || 'Untitled Task';
  }

  getTaskDescription(): string {
    return this.task?.description || this.task?.remarks || '';
  }

  getTaskAssignees(): string[] {
    if (!this.task) return [];
    if (this.task.assigns && this.task.assigns.length > 0) {
      return this.task.assigns.map(a => a.name || 'Unknown');
    }
    if (this.task.assignees && this.task.assignees.length > 0) {
      return this.task.assignees.map(id => this.assignees.find(a => a.id === id)?.name || id);
    }
    return [];
  }

  getProjectName(): string {
    if (!this.task) return '';
    const projectId = this.task.projectId || this.task.projecttaged;
    if (!projectId) return '';
    if (this.task.source === 'ownProject' && this.task.projectName) return this.task.projectName;
    const project = this.projects.find(p => p.id === projectId);
    return project?.name || projectId;
  }

  getPriorityInfo(): { label: string; color: string } {
    const priority = this.task?.priority || 'medium';
    const obj = this.priorities.find(p => p.value === priority);
    return { label: obj?.label || 'Medium', color: obj?.color || '#f59e0b' };
  }

  getStatusInfo(): { label: string; color: string } {
    const status = this.task?.status || 'todo';
    const obj = this.statuses.find(s => s.value === status);
    return { label: obj?.label || 'To Do', color: obj?.color || '#6b7280' };
  }

  getCategoryLabel(): string {
    const c = this.task?.category || (this.task?.source === 'ownProject' ? 'ownProject' : (this.task?.clientId ? 'clientProject' : 'general'));
    const labels: Record<string, string> = { general: 'General', clientProject: 'Client Project', ownProject: 'Own Project' };
    return labels[c] || c;
  }

  startEditTitle(): void {
    if (!this.task) return;
    this.editTitleValue = this.getTaskTitle();
    this.editingField = 'title';
  }

  startEditDescription(): void {
    if (!this.task) return;
    this.editDescValue = this.getTaskDescription();
    this.editingField = 'description';
  }

  blurTitleInput(e: Event): void {
    (e.target as HTMLInputElement)?.blur();
  }

  saveTitle(): void {
    if (!this.task?.id) return;
    const title = (this.editTitleValue || '').trim() || this.getTaskTitle();
    this.editingField = null;
    this.firestore.collection('tasks').doc(this.task.id).update({
      title,
      task: title,
      updatedAt: new Date()
    }).then(() => {
      this.loadTask(this.task!.id!);
      this.showNotification('Title saved', 'success');
    }).catch(() => this.showNotification('Error saving title', 'error'));
  }

  saveDescription(): void {
    if (!this.task?.id) return;
    const description = this.editDescValue ?? this.getTaskDescription();
    this.editingField = null;
    this.firestore.collection('tasks').doc(this.task.id).update({
      description,
      remarks: description,
      updatedAt: new Date()
    }).then(() => {
      this.loadTask(this.task!.id!);
      this.showNotification('Description saved', 'success');
    }).catch(() => this.showNotification('Error saving description', 'error'));
  }

  onBack(): void {
    this.router.navigate(['/admin', 'tasks']);
  }

  onDelete(): void {
    if (!this.task?.id) return;
    if (!confirm('Are you sure you want to delete this task?')) return;
    this.firestore.collection('tasks').doc(this.task.id).delete().then(() => {
      this.showNotification('Task deleted successfully!', 'success');
      this.router.navigate(['/admin', 'tasks']);
    }).catch(() => this.showNotification('Error deleting task', 'error'));
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: [`snackbar-${type}`] });
  }
}
