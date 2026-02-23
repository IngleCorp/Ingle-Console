import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Clipboard } from '@angular/cdk/clipboard';
import { TaskFormComponent, TaskFormData } from './task-form/task-form.component';
import { TaskViewComponent, TaskViewData } from './task-view/task-view.component';

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
  /** Source of the task, e.g. 'ownProject' when synced from an own project board. */
  source?: string;
  /** When source === 'ownProject', id of the ownProjects document. */
  ownProjectId?: string | null;
  /** When source === 'ownProject', id of the subcollection task under the own project. */
  ownProjectTaskId?: string | null;
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

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.loadProjects();
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

  async loadProjects(): Promise<void> {
    try {
      this.firestore.collection('projects').valueChanges({ idField: 'id' }).subscribe((projects: any) => {
        this.projects = projects;
      });
    } catch (error) {
      console.error('Error loading projects:', error);
      this.showNotification('Error loading projects', 'error');
    }
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
          const assigns = (formData.assignees || []).map((uid: string) => ({ uid, name: '', email: '' }));
          await this.firestore.collection('ownProjects').doc(data.ownProjectId).collection('tasks').doc(data.ownProjectTaskId).update({
            title: formData.title,
            description: formData.description ?? '',
            status: formData.status,
            priority: formData.priority,
            progress: updateData.progress ?? 0,
            assigns,
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
        (task.assignees || []).includes(this.selectedAssignee)
      );
    }

    this.dataSource.data = filteredTasks;
    this.categorizeTasks(filteredTasks); // Re-categorize the filtered tasks for the Kanban board
  }

  copyTaskList(): void {
    const taskList = this.tasks.map(task => {
      const title = this.getTaskTitle(task);
      const status = task.status || 'todo';
      const priority = task.priority || 'medium';
      const assignees = this.getTaskAssignees(task).map(id => 
        this.assignees.find(a => a.id === id)?.name || id
      ).join(', ');
      
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
    const project = this.projects.find(p => p.id === projectId);
    return project?.name || projectId;
  }
} 