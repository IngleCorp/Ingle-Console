import { Component, OnInit, ViewChild, HostListener, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskFormComponent, TaskFormData } from './task-form/task-form.component';
import { TaskViewComponent, TaskViewData } from './task-view/task-view.component';

export type TaskCategory = 'general' | 'clientProject' | 'ownProject';

export interface Task {
  // ✅ New Interface Fields
  id?: string;
  title?: string;
  task: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done' | 'hold';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignees?: string[];
  projectId?: string | null;
  projectName?: string | null;
  /** Task category: general (main Tasks), clientProject, or ownProject. */
  category?: TaskCategory;
  /** Source of the task, e.g. 'ownProject' when synced from an own project board. */
  source?: string;
  /** When source === 'ownProject', id of the ownProjects document. */
  ownProjectId?: string | null;
  /** When source === 'ownProject', id of the subcollection task under the own project. */
  ownProjectTaskId?: string | null;
  /** When category === 'clientProject', client id (clients collection). */
  clientId?: string | null;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  isActive?: boolean;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedByName?: string;
  progress?: number;
  timeTaken?: number;
  remarks?: string;

  // 🟡 Legacy/Deprecated Fields — For Backward Compatibility
  req_id_name?: string;            // Deprecated: use `id` or external mapping
  req_task_id?: number;            // Legacy tracking id
  packageName?: string;            // Maybe map to tags or categories
  section?: string;                // Possibly map to tags
  milestone?: string;              // Consider mapping to tags or metadata
  projecttaged?: string | null;           // Duplicate of projectId
  createdby?: string;              // Duplicate of createdByName
  createdbyid?: string;            // Duplicate of createdBy
  assigns?: {
    createdAt?: {
      seconds: number;
      nanoseconds: number;
    };
    uid: string;
    name: string;
  }[];                             // Legacy assignee format
}

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  // Add other project fields if they exist
}

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Close quick-add on outside click — only when the input is still empty
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.quickAddColumn) return;
    const target = event.target as HTMLElement;
    // Always keep open if the click is inside the card or its trigger button
    if (target.closest('.quick-add-card') || target.closest('.col-head-add')) return;
    // Only auto-close when nothing has been typed yet
    if (this.quickAddTitle.trim()) return;
    this.cancelQuickAdd();
  }

  tasks: Task[] = [];
  todoTasks: Task[] = [];
  inProgressTasks: Task[] = [];
  doneTasks: Task[] = [];
  holdTasks: Task[] = [];
  
  dataSource = new MatTableDataSource<Task>([]);
  displayedColumns: string[] = ['title', 'priority', 'assignees', 'status', 'dueDate', 'progress', 'actions'];
  
  selectedStatus = 'all';
  selectedPriority = 'all';
  searchTerm = '';
  isLoading = false;
  selectedAssignee = 'all';
  /** View mode: 'kanban' (board) or 'list' */
  viewMode: 'kanban' | 'list' = 'kanban';

  /** List view: sort */
  listSortColumn: string | null = null;
  listSortDirection: 'asc' | 'desc' = 'asc';

  /** List view: column filters (applied on top of toolbar filters) */
  listFilterCategory = 'all';
  listFilterPriority = 'all';
  listFilterStatus = 'all';
  listFilterAssignee = 'all';
  listFilterProject = 'all';
  listFilterDue = 'all';

  /** List view: available project labels for project filter */
  projectFilterLabels: string[] = [];

  // ── Quick-add inline card ──────────────────────────────────────
  /** Which column has the quick-add card open: null = none */
  quickAddColumn: Task['status'] | null = null;
  /** Quick-add input value */
  quickAddTitle = '';
  /** Saving indicator for quick-add */
  quickAddSaving = false;

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

  assignees: TaskAssignee[] = [
    { id: '1', name: 'Jasmal', email: 'jasmal@example.com' },
    { id: '2', name: 'Ramshin', email: 'ramshin@example.com' },
    { id: '3', name: 'Ajmal', email: 'ajmal@example.com' }
  ];

  projects: Project[] = [];
  ownProjects: Project[] = [];

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private clipboard: Clipboard,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.loadProjects();
    this.loadOwnProjects();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  // 🔧 Backward Compatibility Helper Methods
  getTaskTitle(task: Task): string {
    // Priority: title > task > legacy fields
    return task.title || task.task || task.req_id_name || 'Untitled Task';
  }

  getTaskDescription(task: Task): string {
    return task.description || task.remarks || '';
  }

  getTaskAssignees(task: Task): string[] {
    // New format: task.assignees is string[] of IDs, so we get names
   
    // Legacy format: task.assigns is {uid, name}[], so we get names directly
    if (task.assigns && task.assigns.length > 0) {
      return task.assigns.map(assign => assign.name || 'Unknown');
    }

     if (task.assignees && task.assignees.length > 0) {
      return this.getAssigneeNames(task.assignees);
    }
    
    
    return [];
  }

  getTaskProjectId(task: Task): string {
    return task.projectId || task.projecttaged || '';
  }

  getTaskCreatedBy(task: Task): string {
    return task.createdByName || task.createdby || task.createdBy || 'Unknown User';
  }

  getTaskCreatedById(task: Task): string {
    return task.createdBy || task.createdbyid || '';
  }

  // 🔧 Helper method to convert Firebase Timestamp to Date
  private convertTimestampToDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    
    // If it's already a Date object, return it
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a Firebase Timestamp object
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // If it's a Timestamp-like object with seconds and nanoseconds
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    }
    
    // Try to parse as string or number
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  }

  transformLegacyTask(task: any): Task {
    // Transform legacy task data to new format
    const transformedTask: Task = {
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
      progress: task.progress || 0,
      isActive: task.isActive !== false, // Default to true
      createdAt: this.convertTimestampToDate(task.createdAt) || new Date(),
      updatedAt: this.convertTimestampToDate(task.updatedAt),
      dueDate: this.convertTimestampToDate(task.dueDate),
      tags: task.tags || []
    };

    // Infer category for legacy tasks
    transformedTask.category = task.category || (task.source === 'ownProject' ? 'ownProject' : (task.clientId ? 'clientProject' : 'general'));
    if (task.clientId) transformedTask.clientId = task.clientId;

    // Add legacy fields for backward compatibility
    if (task.req_id_name) transformedTask.req_id_name = task.req_id_name;
    if (task.req_task_id) transformedTask.req_task_id = task.req_task_id;
    if (task.packageName) transformedTask.packageName = task.packageName;
    if (task.section) transformedTask.section = task.section;
    if (task.milestone) transformedTask.milestone = task.milestone;
    if (task.projecttaged) transformedTask.projecttaged = task.projecttaged;
    if (task.createdby) transformedTask.createdby = task.createdby;
    if (task.createdbyid) transformedTask.createdbyid = task.createdbyid;
    if (task.assigns) transformedTask.assigns = task.assigns;

    return transformedTask;
  }

  getTaskCategory(task: Task): TaskCategory {
    return task.category || (task.source === 'ownProject' ? 'ownProject' : (task.clientId ? 'clientProject' : 'general'));
  }

  getTaskCategoryLabel(category: TaskCategory): string {
    const labels: Record<TaskCategory, string> = { general: 'General', clientProject: 'Client Project', ownProject: 'Own Project' };
    return labels[category] || category;
  }

  getStatusLabel(status: string): string {
    const s = this.statuses.find(x => x.value === status);
    return s ? s.label : status;
  }

  /** List view: toggle sort for a column */
  setListSort(column: string): void {
    if (this.listSortColumn === column) {
      this.listSortDirection = this.listSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.listSortColumn = column;
      this.listSortDirection = 'asc';
    }
  }

  /** List view: set column filter */
  setListFilter(column: string, value: string): void {
    switch (column) {
      case 'category': this.listFilterCategory = value; break;
      case 'priority': this.listFilterPriority = value; break;
      case 'status': this.listFilterStatus = value; break;
      case 'assignee': this.listFilterAssignee = value; break;
      case 'project': this.listFilterProject = value; break;
      case 'due': this.listFilterDue = value; break;
      default: break;
    }
  }

  /** List view: filtered and sorted data for table */
  get listViewData(): Task[] {
    let list = [...this.dataSource.data];

    // Column filters
    if (this.listFilterCategory !== 'all') {
      list = list.filter(t => this.getTaskCategory(t) === this.listFilterCategory);
    }
    if (this.listFilterPriority !== 'all') {
      list = list.filter(t => (t.priority || 'medium') === this.listFilterPriority);
    }
    if (this.listFilterStatus !== 'all') {
      list = list.filter(t => t.status === this.listFilterStatus);
    }
    if (this.listFilterAssignee !== 'all') {
      list = list.filter(t => this.getTaskAssignees(t).includes(this.listFilterAssignee));
    }
    if (this.listFilterProject !== 'all') {
      if (this.listFilterProject === 'none') {
        list = list.filter(t => !this.getTaskProjectId(t));
      } else {
        list = list.filter(t => {
          const label = t.projectName || this.getProjectName(this.getTaskProjectId(t));
          return label === this.listFilterProject;
        });
      }
    }
    if (this.listFilterDue !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      list = list.filter(t => {
        const d = t.dueDate ? (t.dueDate instanceof Date ? t.dueDate : new Date((t.dueDate as any)?.seconds ? (t.dueDate as any).seconds * 1000 : t.dueDate)) : null;
        if (this.listFilterDue === 'noDate') return !d;
        if (!d) return false;
        if (this.listFilterDue === 'overdue') return d < today;
        if (this.listFilterDue === 'thisWeek') return d >= today && d < endOfWeek;
        return true;
      });
    }

    // Sort
    if (this.listSortColumn && this.listSortDirection) {
      const dir = this.listSortDirection === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        let va: any, vb: any;
        switch (this.listSortColumn) {
          case 'title':
            va = this.getTaskTitle(a).toLowerCase();
            vb = this.getTaskTitle(b).toLowerCase();
            return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
          case 'category':
            va = this.getTaskCategoryLabel(this.getTaskCategory(a));
            vb = this.getTaskCategoryLabel(this.getTaskCategory(b));
            return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
          case 'priority':
            const order = { urgent: 4, high: 3, medium: 2, low: 1 };
            va = order[(a.priority || 'medium') as keyof typeof order] ?? 2;
            vb = order[(b.priority || 'medium') as keyof typeof order] ?? 2;
            return (va - vb) * dir;
          case 'status':
            const statusOrder = { todo: 1, 'in-progress': 2, done: 3, hold: 4 };
            va = statusOrder[a.status] ?? 0;
            vb = statusOrder[b.status] ?? 0;
            return (va - vb) * dir;
          case 'assignee':
            va = this.getTaskAssignees(a)[0] || '';
            vb = this.getTaskAssignees(b)[0] || '';
            return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
          case 'project':
            va = a.projectName || this.getProjectName(this.getTaskProjectId(a));
            vb = b.projectName || this.getProjectName(this.getTaskProjectId(b));
            va = (va || '').toLowerCase();
            vb = (vb || '').toLowerCase();
            return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
          case 'dueDate':
            const da = a.dueDate ? (a.dueDate instanceof Date ? a.dueDate.getTime() : new Date((a.dueDate as any)?.seconds ? (a.dueDate as any).seconds * 1000 : a.dueDate).getTime()) : 0;
            const db = b.dueDate ? (b.dueDate instanceof Date ? b.dueDate.getTime() : new Date((b.dueDate as any)?.seconds ? (b.dueDate as any).seconds * 1000 : b.dueDate).getTime()) : 0;
            return (da - db) * dir;
          default:
            return 0;
        }
      });
    }
    return list;
  }

  /** Whether a list column filter is active (not "all") */
  isListFilterActive(column: string): boolean {
    switch (column) {
      case 'category': return this.listFilterCategory !== 'all';
      case 'priority': return this.listFilterPriority !== 'all';
      case 'status': return this.listFilterStatus !== 'all';
      case 'assignee': return this.listFilterAssignee !== 'all';
      case 'project': return this.listFilterProject !== 'all';
      case 'due': return this.listFilterDue !== 'all';
      default: return false;
    }
  }

  /** Sort icon for list column header */
  getListSortIcon(column: string): string {
    if (this.listSortColumn !== column) return 'unfold_more';
    return this.listSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  async loadProjects(): Promise<void> {
    try {
      this.firestore.collection('projects').valueChanges({ idField: 'id' }).subscribe((projects: any) => {
        this.projects = projects;
        this.updateProjectFilterLabels();
      });
    } catch (error) {
      console.error('Error loading projects:', error);
      this.showNotification('Error loading projects', 'error');
    }
  }

  loadOwnProjects(): void {
    this.firestore.collection('ownProjects').valueChanges({ idField: 'id' }).subscribe((projects: any[]) => {
      this.ownProjects = projects.map(p => ({ id: p.id, name: p.name || p.title || p.id }));
    });
  }

  async loadTasks(): Promise<void> {
    this.isLoading = true;
    try {
      const user = await this.auth.currentUser;
      if (user) {
        this.firestore.collection('tasks', ref => 
          ref.orderBy('createdAt', 'desc')
        ).valueChanges({ idField: 'id' }).subscribe((data: any) => {
          this.tasks = data.map((task: any) => this.transformLegacyTask(task));
          this.updateProjectFilterLabels();
          this.applyFilter(); // Apply initial filter (which will also categorize)
          this.isLoading = false;
        });
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.showNotification('Error loading tasks', 'error');
      this.isLoading = false;
    }
  }

  categorizeTasks(tasksToCategorize: Task[]): void {
    this.todoTasks = tasksToCategorize.filter(task => task.status === 'todo');
    this.inProgressTasks = tasksToCategorize.filter(task => task.status === 'in-progress');
    this.doneTasks = tasksToCategorize.filter(task => task.status === 'done');
    this.holdTasks = tasksToCategorize.filter(task => task.status === 'hold');
  }

  // ── Quick-add ────────────────────────────────────────────────────
  openQuickAdd(status: Task['status']): void {
    this.quickAddColumn = status;
    this.quickAddTitle = '';
  }

  cancelQuickAdd(): void {
    this.quickAddColumn = null;
    this.quickAddTitle = '';
  }

  async saveQuickAdd(): Promise<void> {
    const title = this.quickAddTitle.trim();
    if (!title || this.quickAddSaving) return;
    this.quickAddSaving = true;
    try {
      const user = await this.auth.currentUser;
      const now = new Date();
      await this.firestore.collection('tasks').add({
        title,
        task: title,
        status: this.quickAddColumn!,
        priority: 'medium',
        assignees: [],
        category: 'general',
        isActive: true,
        progress: 0,
        createdAt: now,
        createdBy: user?.uid || '',
        createdByName: user?.displayName || user?.email || 'Unknown',
        updatedAt: now,
      });
      this.showNotification('Task added', 'success');
      this.cancelQuickAdd();
    } catch {
      this.showNotification('Error adding task', 'error');
    } finally {
      this.quickAddSaving = false;
    }
  }

  openTaskDialog(isEditing: boolean, task?: Task): void {
    const dialogData: TaskFormData = {
      isEditing,
      task,
      projects: this.projects,
      assignees: this.assignees,
      priorities: this.priorities,
      statuses: this.statuses
    };

    const dialogRef = this.dialog.open(TaskFormComponent, {
      width: '800px',
      data: dialogData,
      disableClose: true,
      panelClass: 'task-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (isEditing) {
          this.updateTask(task!.id!, result);
        } else {
          this.addTask(result);
        }
      }
    });
  }

  openTaskDetails(taskId: string): void {
    this.router.navigate(['/admin/tasks', taskId]);
  }

  openTaskView(task: Task): void {
    const dialogData: TaskViewData = {
      task,
      assignees: this.assignees,
      projects: this.projects,
      priorities: this.priorities,
      statuses: this.statuses
    };

    const dialogRef = this.dialog.open(TaskViewComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: dialogData,
      panelClass: 'task-view-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.action === 'edit') {
          this.openTaskDialog(true, result.task);
        } else if (result.action === 'delete') {
          this.deleteTask(result.task.id!);
        }
      }
    });
  }

  async addTask(formData: any): Promise<void> {
    this.isLoading = true;
    try {
      const user = await this.auth.currentUser;
      if (user) {
        const selectedProject = this.projects.find(p => p.id === formData.projectId);
        
        const taskData: Task = {
          ...formData,
          task: formData.title,
          createdAt: new Date(),
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Unknown User',
          progress: 0,
          isActive: true,
          assignees: formData.assignees || [],
          projectId: selectedProject?.id || null,
          projectName: selectedProject?.name || null,
          projecttaged: selectedProject?.id || null,
          category: 'general',
        };

        const docRef = await this.firestore.collection('tasks').add(taskData);
        // Record activity
        await this.firestore.collection('activities').add({
          type: 'task',
          action: 'Created',
          entityId: docRef.id,
          entityName: taskData.task,
          details: `New task created: ${taskData.task}`,
          createdAt: new Date(),
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Unknown User',
          icon: 'add_task'
        });
        this.showNotification('Task added successfully!', 'success');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      this.showNotification('Error adding task', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  async updateTask(taskId: string, formData: any): Promise<void> {
    this.isLoading = true;
    try {
      const user = await this.auth.currentUser;
      if (user) {
        const selectedProject = this.projects.find(p => p.id === formData.projectId);
        const updateData = {
          ...formData,
          task: formData.title,
          updatedAt: new Date(),
          updatedBy: user.uid,
          updatedByName: user.displayName || user.email || 'Unknown User',
          assignees: formData.assignees || [],
          projectId: selectedProject?.id || null,
          projectName: selectedProject?.name || null,
          projecttaged: selectedProject?.id || null,
        };
        await this.firestore.collection('tasks').doc(taskId).update(updateData);
        const taskSnap = await this.firestore.collection('tasks').doc(taskId).get().toPromise();
        const data = taskSnap?.data() as any;
        if (data?.source === 'ownProject' && data?.ownProjectId && data?.ownProjectTaskId) {
          const assigns = (formData.assignees || []).map((uid: string) => {
            const a = this.assignees.find(x => x.id === uid);
            return { uid, name: a?.name || uid, email: a?.email || '' };
          });
          await this.firestore.collection('ownProjects').doc(data.ownProjectId).collection('tasks').doc(data.ownProjectTaskId).update({
            title: formData.title,
            description: formData.description ?? '',
            status: formData.status,
            priority: formData.priority,
            progress: updateData.progress ?? 0,
            assigns,
            assignees: formData.assignees || [],
            dueDate: formData.dueDate ?? null,
            estimatedHours: formData.estimatedHours ?? null,
            tags: formData.tags ?? [],
            updatedAt: updateData.updatedAt,
            updatedBy: updateData.updatedBy,
            updatedByName: updateData.updatedByName
          });
        }
        this.showNotification('Task updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      this.showNotification('Error updating task', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        const taskSnap = await this.firestore.collection('tasks').doc(taskId).get().toPromise();
        const data = taskSnap?.data() as any;
        if (data?.source === 'ownProject' && data?.ownProjectId && data?.ownProjectTaskId) {
          await this.firestore.collection('ownProjects').doc(data.ownProjectId).collection('tasks').doc(data.ownProjectTaskId).delete();
        }
        await this.firestore.collection('tasks').doc(taskId).delete();
        this.showNotification('Task deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting task:', error);
        this.showNotification('Error deleting task', 'error');
      }
    }
  }

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<void> {
    try {
      const user = await this.auth.currentUser;
      const updateData: any = { status, updatedAt: new Date() };
      if (status === 'done') {
        updateData.progress = 100;
        updateData.timeTaken = 0;
      }
      if (user) {
        updateData.updatedBy = user.uid;
        updateData.updatedByName = user.displayName || user.email || 'Unknown User';
      }
      await this.firestore.collection('tasks').doc(taskId).update(updateData);
      const taskSnap = await this.firestore.collection('tasks').doc(taskId).get().toPromise();
      const data = taskSnap?.data() as any;
      if (data?.source === 'ownProject' && data?.ownProjectId && data?.ownProjectTaskId) {
        await this.firestore.collection('ownProjects').doc(data.ownProjectId).collection('tasks').doc(data.ownProjectTaskId).update(updateData);
      }
      this.showNotification(`Task moved to ${status}`, 'success');
    } catch (error) {
      console.error('Error updating task status:', error);
      this.showNotification('Error updating task status', 'error');
    }
  }

  /** Kanban: handle drag and drop between columns */
  onTaskDrop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const newStatus = event.container.id as Task['status'];
    const valid: Task['status'][] = ['todo', 'in-progress', 'done', 'hold'];
    if (!valid.includes(newStatus)) return;
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    const task = event.container.data[event.currentIndex];
    if (task?.id) {
      task.status = newStatus;
      if (newStatus === 'done') task.progress = 100;
      const inData = this.dataSource.data.find(t => t.id === task.id);
      if (inData) inData.status = newStatus;
      this.updateTaskStatus(task.id, newStatus);
    }
  }

  async updateTaskProgress(taskId: string, progress: number): Promise<void> {
    try {
      const updateData = { progress: Math.min(100, Math.max(0, progress)), updatedAt: new Date() };
      await this.firestore.collection('tasks').doc(taskId).update(updateData);
      const taskSnap = await this.firestore.collection('tasks').doc(taskId).get().toPromise();
      const data = taskSnap?.data() as any;
      if (data?.source === 'ownProject' && data?.ownProjectId && data?.ownProjectTaskId) {
        await this.firestore.collection('ownProjects').doc(data.ownProjectId).collection('tasks').doc(data.ownProjectTaskId).update(updateData);
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
      this.showNotification('Error updating task progress', 'error');
    }
  }

  applyFilter(): void {
    let filteredTasks = [...this.tasks];

    // Filter by search term
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filteredTasks = filteredTasks.filter(task => {
        const title = this.getTaskTitle(task).toLowerCase();
        const description = this.getTaskDescription(task).toLowerCase();
        const tags = (task.tags || []).join(' ').toLowerCase();
        return title.includes(searchLower) || 
               description.includes(searchLower) || 
               tags.includes(searchLower);
      });
    }

    // Filter by status
    if (this.selectedStatus !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.status === this.selectedStatus);
    }

    // Filter by priority
    if (this.selectedPriority !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.priority === this.selectedPriority);
    }

    // Filter by assignee
    if (this.selectedAssignee !== 'all') {
      filteredTasks = filteredTasks.filter(task => 
        this.getTaskAssignees(task).includes(this.selectedAssignee)
      );
    }

    this.dataSource.data = filteredTasks;
    this.categorizeTasks(filteredTasks); // Re-categorize the filtered tasks for the Kanban board
  }

  /** Rebuild list of unique project labels used in tasks for the project column filter */
  private updateProjectFilterLabels(): void {
    const labels = new Set<string>();
    this.tasks.forEach(task => {
      const projectId = this.getTaskProjectId(task);
      if (!projectId) {
        return;
      }
      const label = task.projectName || this.getProjectName(projectId);
      if (label) {
        labels.add(label);
      }
    });
    this.projectFilterLabels = Array.from(labels).sort((a, b) =>
      a.localeCompare(b),
    );
  }

  copyTaskList(): void {
    const source = this.viewMode === 'list' ? this.listViewData : this.dataSource.data;
    const taskList = source.map(task => {
      const title = this.getTaskTitle(task);
      const status = task.status || 'todo';
      const priority = task.priority || 'medium';
      const assignees = this.getTaskAssignees(task).join(', ');
      return `${title} - ${status} (${priority}) - ${assignees}`;
    }).join('\n');

    this.clipboard.copy(taskList);
    this.showNotification('Task list copied to clipboard!', 'success');
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: [`snackbar-${type}`]
    });
  }

  getPriorityColor(priority: string | undefined): string {
    if (!priority) return '#6b7280'; // Default gray color for undefined priority
    const priorityObj = this.priorities.find(p => p.value === priority);
    return priorityObj?.color || '#6b7280';
  }

  getStatusColor(status: string | undefined): string {
    if (!status) return '#6b7280'; // Default gray color for undefined status
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj?.color || '#6b7280';
  }

  getAssigneeNames(assigneeIds: string[]): string[] {
    // console.log('Assignee IDs:', assigneeIds);
    // console.log(' this.assignees IDs:',  this.assignees);
    

    return assigneeIds.map(id => 
      this.assignees.find(a => a.id === id)?.name || id
    );
  }

  getProjectName(projectId: string): string {
    if (!projectId) return '';
    const allProjects = [...this.projects, ...this.ownProjects];
    return allProjects.find(p => p.id === projectId)?.name || projectId;
  }
} 