import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';

const OWN_PROJECTS_COLLECTION = 'ownProjects';
const ROOT_TASKS_COLLECTION = 'tasks';
const ACTIVITIES_COLLECTION = 'activities';
const KANBAN_STATUSES = ['todo', 'in-progress', 'done', 'hold'] as const;

@Component({
  selector: 'app-own-project-tasks',
  templateUrl: './own-project-tasks.component.html',
  styleUrls: ['./own-project-tasks.component.scss']
})
export class OwnProjectTasksComponent implements OnInit, OnDestroy {
  projectId: string | null = null;
  taskText = '';
  taskdata: any[] = [];
  tasktodo: any[] = [];
  taskinprogress: any[] = [];
  taskdone: any[] = [];
  taskonhold: any[] = [];
  isLoading = false;
  viewMode: 'kanban' | 'list' = 'kanban';

  /** Quick-add state */
  quickAddColumn: string | null = null;
  quickAddTitle = '';
  quickAddSaving = false;

  private tasksSub?: Subscription;

  private readonly priorityColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    urgent: '#dc2626'
  };

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.quickAddColumn) return;
    const target = event.target as HTMLElement;
    if (target.closest('.opt-quick-add') || target.closest('.opt-col-add')) return;
    if (this.quickAddTitle.trim()) return;
    this.cancelQuickAdd();
  }

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.parent?.paramMap?.subscribe(params => {
      this.projectId = params.get('projectId') ?? null;
      this.tasksSub?.unsubscribe();
      if (this.projectId) this.getTasks();
      else {
        this.taskdata = [];
        this.tasktodo = [];
        this.taskinprogress = [];
        this.taskdone = [];
        this.taskonhold = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.tasksSub?.unsubscribe();
  }

  getTasks(): void {
    if (!this.projectId) return;
    this.isLoading = true;
    this.tasksSub = this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks')
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (res: any) => {
          this.taskdata = res || [];
          this.tasktodo = this.taskdata.filter(t => (t.status || 'todo') === 'todo');
          this.taskinprogress = this.taskdata.filter(t => t.status === 'in-progress');
          this.taskdone = this.taskdata.filter(t => t.status === 'done');
          this.taskonhold = this.taskdata.filter(t => t.status === 'hold');
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error loading tasks', 'Close', { duration: 3000 });
        }
      });
  }

  addTask(): void {
    const text = this.taskText?.trim();
    if (!text || !this.projectId) return;
    this.isLoading = true;
    const createdBy = localStorage.getItem('userid') || '';
    const createdByName = localStorage.getItem('username') || 'Unknown';
    const payload = {
      title: text,
      description: '',
      status: 'todo',
      priority: 'medium',
      progress: 0,
      assigns: [],
      dueDate: null,
      estimatedHours: null,
      createdAt: new Date(),
      createdBy,
      createdByName
    };
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').add(payload)
      .then(async (docRef) => {
        this.taskText = '';
        this.snackBar.open('Task added', 'Close', { duration: 2000 });
        this.getTasks();
        // Sync to root tasks collection and keep reference both ways
        try {
          const projectSnap = await this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).get().toPromise();
          const projectName = (projectSnap?.data() as any)?.name || 'Own Project';
          const rootTaskData = {
            task: text,
            title: text,
            description: '',
            status: 'todo',
            priority: 'medium',
            progress: 0,
            assignees: [],
            assigns: [],
            projectId: this.projectId,
            projectName,
            projecttaged: this.projectId,
            createdAt: new Date(),
            createdBy,
            createdByName,
            isActive: true,
            category: 'ownProject',
            source: 'ownProject',
            ownProjectId: this.projectId,
            ownProjectTaskId: docRef.id
          };
          const rootRef = await this.afs.collection(ROOT_TASKS_COLLECTION).add(rootTaskData);
          await this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).collection('tasks').doc(docRef.id).update({ rootTaskId: rootRef.id });
        } catch (e) {
          console.warn('Could not sync task to main tasks list', e);
        }
        // Record activity
        try {
          await this.afs.collection(ACTIVITIES_COLLECTION).add({
            type: 'task',
            action: 'Created',
            entityId: docRef.id,
            entityName: text,
            details: `Task created in Own Project: ${text}`,
            createdAt: new Date(),
            createdBy,
            createdByName,
            icon: 'add_task'
          });
        } catch (e) {
          console.warn('Could not record activity', e);
        }
      })
      .catch(() => {
        this.snackBar.open('Failed to add task', 'Close', { duration: 3000 });
        this.isLoading = false;
      });
  }

  updateTaskStatus(taskId: string, newStatus: string): void {
    if (!this.projectId) return;
    const updatedAt = new Date();
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').doc(taskId)
      .update({ status: newStatus, updatedAt })
      .then(async () => {
        const taskSnap = await this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).collection('tasks').doc(taskId).get().toPromise();
        const rootTaskId = (taskSnap?.data() as any)?.rootTaskId;
        if (rootTaskId) {
          try {
            const update: any = { status: newStatus, updatedAt };
            if (newStatus === 'done') update.progress = 100;
            await this.afs.collection(ROOT_TASKS_COLLECTION).doc(rootTaskId).update(update);
          } catch (e) {
            console.warn('Could not sync status to main tasks', e);
          }
        }
      })
      .catch(() => this.snackBar.open('Update failed', 'Close', { duration: 3000 }));
  }

  onTaskDrop(event: CdkDragDrop<any[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const newStatus = event.container.id as string;
    if (!KANBAN_STATUSES.includes(newStatus as any)) return;
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    const task = event.container.data[event.currentIndex];
    if (task?.id) {
      task.status = newStatus;
      const inTaskdata = this.taskdata.find(t => t.id === task.id);
      if (inTaskdata) inTaskdata.status = newStatus;
      this.updateTaskStatus(task.id, newStatus);
    }
  }

  deleteTask(taskId: string): void {
    if (!confirm('Delete this task?')) return;
    if (!this.projectId) return;
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').doc(taskId).get().toPromise()
      .then(async (taskSnap) => {
        const rootTaskId = (taskSnap?.data() as any)?.rootTaskId;
        if (rootTaskId) {
          try {
            await this.afs.collection(ROOT_TASKS_COLLECTION).doc(rootTaskId).delete();
          } catch (e) {
            console.warn('Could not delete from main tasks', e);
          }
        }
        return this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).collection('tasks').doc(taskId).delete();
      })
      .then(() => {
        this.snackBar.open('Task deleted', 'Close', { duration: 2000 });
        this.getTasks();
      })
      .catch(() => this.snackBar.open('Delete failed', 'Close', { duration: 3000 }));
  }

  async goToTaskDetail(ownTaskId: string): Promise<void> {
    if (!this.projectId) return;

    // Find the task in memory first
    const task = this.taskdata.find(t => t.id === ownTaskId);

    const navExtras = { queryParams: { source: 'ownProject', projectId: this.projectId } };

    // If rootTaskId already exists, navigate straight to the shared task-details page
    if (task?.rootTaskId) {
      this.router.navigate(['/admin/tasks', task.rootTaskId], navExtras);
      return;
    }

    // No rootTaskId — fetch the doc to be sure (handles stale in-memory data)
    try {
      const snap = await this.afs
        .collection(OWN_PROJECTS_COLLECTION).doc(this.projectId)
        .collection('tasks').doc(ownTaskId).get().toPromise();
      const data = snap?.data() as any;

      if (data?.rootTaskId) {
        // Update in-memory cache
        if (task) task.rootTaskId = data.rootTaskId;
        this.router.navigate(['/admin/tasks', data.rootTaskId], navExtras);
        return;
      }

      // Still no rootTaskId — create the root task doc now and link it
      const projectSnap = await this.afs
        .collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).get().toPromise();
      const projectName = (projectSnap?.data() as any)?.name || 'Own Project';
      const createdBy  = localStorage.getItem('userid')   || '';
      const createdByName = localStorage.getItem('username') || 'Unknown';

      const rootPayload = {
        task:           data?.title || '',
        title:          data?.title || '',
        description:    data?.description || '',
        status:         data?.status || 'todo',
        priority:       data?.priority || 'medium',
        progress:       data?.progress ?? 0,
        assignees:      (data?.assigns || []).map((a: any) => a.uid),
        assigns:        data?.assigns || [],
        projectId:      this.projectId,
        projectName,
        projecttaged:   this.projectId,
        createdAt:      data?.createdAt || new Date(),
        createdBy:      data?.createdBy  || createdBy,
        createdByName:  data?.createdByName || createdByName,
        updatedAt:      new Date(),
        isActive:       true,
        category:       'ownProject',
        source:         'ownProject',
        ownProjectId:   this.projectId,
        ownProjectTaskId: ownTaskId,
        tags:           data?.tags || []
      };

      const rootRef = await this.afs.collection(ROOT_TASKS_COLLECTION).add(rootPayload);

      // Write rootTaskId back to the own-project task
      await this.afs
        .collection(OWN_PROJECTS_COLLECTION).doc(this.projectId)
        .collection('tasks').doc(ownTaskId)
        .update({ rootTaskId: rootRef.id });

      if (task) task.rootTaskId = rootRef.id;
      this.router.navigate(['/admin/tasks', rootRef.id], navExtras);

    } catch (e) {
      console.error('Could not open task detail', e);
      this.snackBar.open('Could not open task', 'Close', { duration: 3000 });
    }
  }

  /** Normalize assignees from task: supports assigns (array of {uid, name?, email?}) or assignees (array of IDs). */
  private normalizeAssignees(task: any): { name: string }[] {
    const assigns = task?.assigns || [];
    if (assigns.length) {
      return assigns.map((a: any) => ({
        name: (a.name || a.email || a.uid || 'Unknown').trim() || 'Unknown'
      }));
    }
    // Some docs may only have assignees (array of UIDs) when synced from root task
    const assigneeIds = task?.assignees || [];
    if (assigneeIds.length) {
      return assigneeIds.map((id: string) => ({ name: id }));
    }
    return [];
  }

  getAssigneesDisplay(task: any): string {
    const list = this.normalizeAssignees(task);
    if (!list.length) return '';
    return list.map(a => a.name).join(', ');
  }

  /** Returns assignee list for display as chips/badges; empty array when unassigned. */
  getAssigneesList(task: any): { name: string }[] {
    return this.normalizeAssignees(task);
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
    return map[priority] || priority || 'Medium';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done', hold: 'On Hold' };
    return map[status] || status || 'To Do';
  }

  openQuickAdd(status: string): void {
    this.quickAddColumn = status;
    this.quickAddTitle = '';
  }

  cancelQuickAdd(): void {
    this.quickAddColumn = null;
    this.quickAddTitle = '';
  }

  async saveQuickAdd(): Promise<void> {
    const title = this.quickAddTitle.trim();
    if (!title || this.quickAddSaving || !this.projectId) return;
    this.quickAddSaving = true;
    const createdBy = localStorage.getItem('userid') || '';
    const createdByName = localStorage.getItem('username') || 'Unknown';
    const now = new Date();
    const payload = {
      title,
      description: '',
      status: this.quickAddColumn!,
      priority: 'medium',
      progress: 0,
      assigns: [],
      dueDate: null,
      estimatedHours: null,
      createdAt: now,
      createdBy,
      createdByName
    };
    try {
      const docRef = await this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').add(payload);
      // Sync to root tasks collection
      try {
        const projectSnap = await this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).get().toPromise();
        const projectName = (projectSnap?.data() as any)?.name || 'Own Project';
        const rootTaskData = {
          task: title, title, description: '', status: this.quickAddColumn!, priority: 'medium',
          progress: 0, assignees: [], assigns: [], projectId: this.projectId, projectName,
          projecttaged: this.projectId, createdAt: now, createdBy, createdByName,
          isActive: true, category: 'ownProject', source: 'ownProject',
          ownProjectId: this.projectId, ownProjectTaskId: docRef.id
        };
        const rootRef = await this.afs.collection(ROOT_TASKS_COLLECTION).add(rootTaskData);
        await this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).collection('tasks').doc(docRef.id).update({ rootTaskId: rootRef.id });
      } catch (e) { console.warn('Could not sync to main tasks', e); }
      this.snackBar.open('Task added', 'Close', { duration: 2000 });
      this.cancelQuickAdd();
    } catch {
      this.snackBar.open('Failed to add task', 'Close', { duration: 3000 });
    } finally {
      this.quickAddSaving = false;
    }
  }

  getPriorityColor(priority: string): string {
    return this.priorityColors[priority] || '#f59e0b';
  }

  trackByTask(_: number, task: any): string {
    return task.id;
  }
}
