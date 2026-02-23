import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

const OWN_PROJECTS_COLLECTION = 'ownProjects';

export interface AssigneeOption {
  id: string;
  name: string;
  email?: string;
}

@Component({
  selector: 'app-own-project-task-detail',
  templateUrl: './own-project-task-detail.component.html',
  styleUrls: ['./own-project-task-detail.component.scss']
})
export class OwnProjectTaskDetailComponent implements OnInit, OnDestroy {
  projectId: string | null = null;
  taskId: string | null = null;
  taskForm: FormGroup;
  task: any = null;
  users: AssigneeOption[] = [];
  isLoading = false;
  isSaving = false;
  private taskSub?: Subscription;

  statuses = [
    { value: 'todo', label: 'To Do', icon: 'pending' },
    { value: 'in-progress', label: 'In Progress', icon: 'progress_activity' },
    { value: 'done', label: 'Done', icon: 'check_circle' },
    { value: 'hold', label: 'On Hold', icon: 'pause_circle' }
  ];

  priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      status: ['todo', Validators.required],
      priority: ['medium', Validators.required],
      assigneeIds: [[]],
      dueDate: [''],
      estimatedHours: ['', [Validators.min(0), Validators.max(1000)]],
      progress: [0, [Validators.min(0), Validators.max(100)]],
      tags: ['']
    });
  }

  ngOnInit(): void {
    const applyRoute = () => {
      this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
      this.taskId = this.route.snapshot.paramMap.get('taskId') ?? null;
      this.taskSub?.unsubscribe();
      if (this.projectId && this.taskId) {
        this.loadTask();
      } else if (this.projectId) {
        this.task = null;
        this.backToList();
      } else {
        this.snackBar.open('Task not found', 'Close', { duration: 3000 });
        this.backToList();
      }
    };
    this.loadUsers();
    this.route.parent?.paramMap?.subscribe(() => applyRoute());
    this.route.paramMap.subscribe(() => applyRoute());
  }

  ngOnDestroy(): void {
    this.taskSub?.unsubscribe();
  }

  loadUsers(): void {
    this.afs.collection('users').valueChanges({ idField: 'id' }).subscribe({
      next: (data: any) => {
        this.users = (data || []).map((u: any) => ({
          id: u.id,
          name: u.displayName || u.name || u.email?.split('@')[0] || 'Unknown',
          email: u.email || ''
        }));
      },
      error: () => {
        this.users = [];
      }
    });
  }

  loadTask(): void {
    if (!this.projectId || !this.taskId) return;
    this.isLoading = true;
    this.taskSub = this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').doc(this.taskId)
      .valueChanges()
      .subscribe({
        next: (data: any) => {
          this.task = data;
          this.isLoading = false;
          if (data) this.patchForm(data);
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error loading task', 'Close', { duration: 3000 });
        }
      });
  }

  private patchForm(data: any): void {
    const assignIds = (data.assigns || []).map((a: any) => a.uid || a.id).filter(Boolean);
    let dueDate = data.dueDate;
    if (dueDate?.seconds) dueDate = new Date(dueDate.seconds * 1000);
    this.taskForm.patchValue({
      title: data.title || '',
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assigneeIds: assignIds.length ? assignIds : [],
      dueDate: dueDate || '',
      estimatedHours: data.estimatedHours ?? '',
      progress: data.progress ?? 0,
      tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || '')
    });
  }

  save(): void {
    if (this.taskForm.invalid || !this.projectId || !this.taskId) return;
    this.isSaving = true;
    const v = this.taskForm.value;
    const selectedUsers = this.users.filter(u => (v.assigneeIds || []).includes(u.id));
    const assigns = selectedUsers.map(u => ({ uid: u.id, name: u.name, email: u.email }));
    const payload = {
      title: v.title,
      description: v.description || '',
      status: v.status,
      priority: v.priority,
      assigns,
      dueDate: v.dueDate || null,
      estimatedHours: v.estimatedHours ? Number(v.estimatedHours) : null,
      progress: v.progress ?? 0,
      tags: v.tags ? v.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      updatedAt: new Date(),
      updatedBy: localStorage.getItem('userid') || '',
      updatedByName: localStorage.getItem('username') || 'Unknown'
    };
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').doc(this.taskId).update(payload)
      .then(() => {
        this.snackBar.open('Task updated', 'Close', { duration: 3000 });
        this.isSaving = false;
        this.task = { ...this.task, ...payload };
      })
      .catch(() => {
        this.snackBar.open('Update failed', 'Close', { duration: 3000 });
        this.isSaving = false;
      });
  }

  backToList(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  deleteTask(): void {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    if (!this.projectId || !this.taskId) return;
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').doc(this.taskId).delete()
      .then(() => {
        this.snackBar.open('Task deleted', 'Close', { duration: 3000 });
        this.backToList();
      })
      .catch(() => this.snackBar.open('Delete failed', 'Close', { duration: 3000 }));
  }

  getCreatedDisplay(): string {
    if (!this.task?.createdAt?.seconds) return '—';
    return new Date(this.task.createdAt.seconds * 1000).toLocaleString();
  }

  getUpdatedDisplay(): string {
    if (!this.task?.updatedAt?.seconds) return '—';
    return new Date(this.task.updatedAt.seconds * 1000).toLocaleString();
  }
}
