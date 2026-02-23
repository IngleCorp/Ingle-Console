import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';

const OWN_PROJECTS_COLLECTION = 'ownProjects';
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
  private tasksSub?: Subscription;

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
      createdBy: localStorage.getItem('userid') || '',
      createdByName: localStorage.getItem('username') || 'Unknown'
    };
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').add(payload)
      .then(() => {
        this.taskText = '';
        this.snackBar.open('Task added', 'Close', { duration: 2000 });
        this.getTasks();
      })
      .catch(() => {
        this.snackBar.open('Failed to add task', 'Close', { duration: 3000 });
        this.isLoading = false;
      });
  }

  updateTaskStatus(taskId: string, newStatus: string): void {
    if (!this.projectId) return;
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').doc(taskId)
      .update({ status: newStatus, updatedAt: new Date() })
      .then(() => { /* valueChanges will update lists */ })
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
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('tasks').doc(taskId).delete()
      .then(() => {
        this.snackBar.open('Task deleted', 'Close', { duration: 2000 });
        this.getTasks();
      })
      .catch(() => this.snackBar.open('Delete failed', 'Close', { duration: 3000 }));
  }

  goToTaskDetail(taskId: string): void {
    if (!this.projectId) return;
    this.router.navigate(['tasks', taskId], { relativeTo: this.route.parent });
  }

  getAssigneesDisplay(task: any): string {
    const assigns = task.assigns || [];
    if (!assigns.length) return '';
    return assigns.map((a: any) => a.name || a.email || '?').join(', ');
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
    return map[priority] || priority || 'Medium';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done', hold: 'On Hold' };
    return map[status] || status || 'To Do';
  }

  trackByTask(_: number, task: any): string {
    return task.id;
  }
}
