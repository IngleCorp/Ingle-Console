import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { startWith, map, finalize } from 'rxjs/operators';
import { Task, TaskAssignee, Project } from '../tasks.component';

export interface TaskAttachment {
  id?: string;
  name: string;
  url: string;
  fileref: string;
  format: string;
  size: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: Date;
}

export interface TaskComment {
  id?: string;
  authorName: string;
  authorId: string;
  text: string;
  createdAt: Date;
}

export interface TaskHistoryEntry {
  who: string;
  action: string;
  time: Date;
}

@Component({
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.scss']
})
export class TaskDetailsComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  task: Task | null = null;
  isLoading = true;
  notFound = false;

  /** Tab state */
  activeTab: 'description' | 'attachments' | 'details' = 'description';
  activityTab: 'comments' | 'history' = 'comments';

  /** Attachments */
  attachments: TaskAttachment[] = [];
  isUploading = false;
  uploadProgress = 0;
  isDragOver = false;

  /** Inline editing */
  editingField: 'title' | 'description' | null = null;
  editTitleValue = '';
  editDescValue = '';

  /** Comments */
  comments: TaskComment[] = [];
  newComment = '';

  /** History (local log for this session) */
  history: TaskHistoryEntry[] = [];

  /** Labels / Tags */
  allLabels: string[] = [];
  labelInput = '';
  showLabelDropdown = false;

  get filteredLabels(): string[] {
    const q = this.labelInput.trim().toLowerCase();
    const current = this.task?.tags || [];
    // Exclude already-added tags; filter by search query
    return this.allLabels.filter(l => !current.includes(l) && (!q || l.toLowerCase().includes(q)));
  }

  /** True when the typed text exactly matches a label already on this task (case-insensitive). */
  get labelAlreadyAdded(): boolean {
    const q = this.labelInput.trim().toLowerCase();
    return !!q && (this.task?.tags || []).some(t => t.toLowerCase() === q);
  }

  /** Existing label from the global list that exactly matches the input (case-insensitive), not yet added. */
  get exactMatchLabel(): string | null {
    const q = this.labelInput.trim().toLowerCase();
    if (!q) return null;
    const current = this.task?.tags || [];
    return this.allLabels.find(l => l.toLowerCase() === q && !current.includes(l)) ?? null;
  }

  assignees: TaskAssignee[] = [
    { id: '1', name: 'Jasmal', email: 'jasmal@example.com' },
    { id: '2', name: 'Ramshin', email: 'ramshin@example.com' },
    { id: '3', name: 'Ajmal', email: 'ajmal@example.com' }
  ];
  projects: Project[] = [];
  /** Client projects from Firestore `projects` collection (have clientid field). */
  clientProjects: (Project & { clientid?: string })[] = [];
  /** Own projects from Firestore `ownProjects` collection. */
  ownProjects: Project[] = [];

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
  categories = [
    { value: 'general', label: 'General' },
    { value: 'clientProject', label: 'Client Project' },
    { value: 'ownProject', label: 'Own Project' }
  ];

  projectSearchCtrl = new FormControl('');
  filteredProjects: Observable<Project[]>;
  filteredClientProjects: Observable<(Project & { clientid?: string })[]>;
  filteredOwnProjects: Observable<Project[]>;

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['clean'],
      ['link', 'image']
    ]
  };

  quillStyles = { height: '200px' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private auth: AngularFireAuth,
    private snackBar: MatSnackBar
  ) {
    this.filteredProjects = this.projectSearchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterProjects(value || ''))
    );
    this.filteredClientProjects = this.projectSearchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const q = (value || '').toLowerCase();
        return this.clientProjects.filter(p => p.name.toLowerCase().includes(q));
      })
    );
    this.filteredOwnProjects = this.projectSearchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const q = (value || '').toLowerCase();
        return this.ownProjects.filter(p => p.name.toLowerCase().includes(q));
      })
    );
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }
    this.loadProjects();
    this.loadClientProjects();
    this.loadOwnProjects();
    this.loadLabels();
    this.loadTask(id);
    this.loadComments(id);
    this.loadHistory(id);
    this.loadAttachments(id);
  }

  // ——— Loaders ———
  private filterProjects(value: string): Project[] {
    const q = value.toLowerCase();
    return this.projects.filter(p => p.name.toLowerCase().includes(q));
  }

  private loadProjects(): void {
    this.firestore.collection('projects').valueChanges({ idField: 'id' }).subscribe((projects: any) => {
      this.projects = projects;
    });
  }

  private loadClientProjects(): void {
    this.firestore.collection('projects').valueChanges({ idField: 'id' }).subscribe((projects: any[]) => {
      this.clientProjects = projects.filter(p => p.clientid);
    });
  }

  private loadOwnProjects(): void {
    this.firestore.collection('ownProjects').valueChanges({ idField: 'id' }).subscribe((projects: any[]) => {
      this.ownProjects = projects.map(p => ({ id: p.id, name: p.name || p.title || p.id }));
    });
  }

  private loadLabels(): void {
    this.firestore.collection('labels', ref => ref.orderBy('name')).valueChanges({ idField: 'id' }).subscribe((docs: any[]) => {
      this.allLabels = docs.map(d => d.name).filter(Boolean);
    });
  }

  onLabelInputFocus(): void {
    this.showLabelDropdown = true;
  }

  onLabelInputBlur(): void {
    // Delay so click on dropdown item registers first
    setTimeout(() => { this.showLabelDropdown = false; }, 200);
  }

  onLabelInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const val = this.labelInput.trim();
      if (val) this.addLabel(val);
    } else if (event.key === 'Escape') {
      this.showLabelDropdown = false;
      this.labelInput = '';
    }
  }

  selectLabel(label: string): void {
    this.addLabel(label);
    this.labelInput = '';
    this.showLabelDropdown = true; // keep open to add more
  }

  addLabel(label: string): void {
    if (!this.task?.id || !label.trim()) return;
    const current: string[] = this.task.tags ? [...this.task.tags] : [];
    // Use canonical casing from global list if it exists there
    const canonical = this.allLabels.find(l => l.toLowerCase() === label.trim().toLowerCase()) ?? label.trim();
    // Prevent duplicate (case-insensitive)
    if (current.some(t => t.toLowerCase() === canonical.toLowerCase())) {
      this.showNotification(`"${canonical}" is already added`, 'error');
      this.labelInput = '';
      return;
    }
    const next = [...current, canonical];
    this.labelInput = '';
    // Persist label globally if truly new
    if (!this.allLabels.some(l => l.toLowerCase() === canonical.toLowerCase())) {
      this.firestore.collection('labels').add({ name: canonical, createdAt: new Date() });
    }
    this.task = { ...this.task, tags: next };
    this.addHistoryEntry(`added label "${canonical}"`);
    this.firestore.collection('tasks').doc(this.task.id!).update({ tags: next, updatedAt: new Date() })
      .catch(() => this.showNotification('Error saving label', 'error'));
  }

  removeLabel(label: string): void {
    if (!this.task?.id) return;
    const next = (this.task.tags || []).filter(t => t !== label);
    this.task = { ...this.task, tags: next };
    this.addHistoryEntry(`removed label "${label}"`);
    this.firestore.collection('tasks').doc(this.task.id!).update({ tags: next, updatedAt: new Date() })
      .catch(() => this.showNotification('Error removing label', 'error'));
  }

  /** Returns the effective category of the current task. */
  getTaskCategory(): string {
    if (!this.task) return 'general';
    return this.task.category || (this.task.source === 'ownProject' ? 'ownProject' : (this.task.clientId ? 'clientProject' : 'general'));
  }

  /** Navigate to the linked project page in a new tab. */
  openProjectPage(): void {
    if (!this.task) return;
    const cat = this.getTaskCategory();
    if (cat === 'ownProject') {
      const id = this.task.ownProjectId || this.task.projectId;
      if (id) this.router.navigate(['/admin/own-projects', id]);
    } else if (cat === 'clientProject') {
      const projectId = this.task.projectId || this.task.projecttaged;
      const proj = this.clientProjects.find(p => p.id === projectId);
      const clientId = this.task.clientId || (proj as any)?.clientid;
      if (clientId && projectId) {
        this.router.navigate(['/admin/clients', clientId, 'projects', projectId]);
      }
    }
  }

  /** Saves category and resets the project-related fields. */
  saveCategory(value: string): void {
    if (!this.task?.id) return;
    const now = new Date();
    const update: any = { category: value, projectId: null, projecttaged: null, clientId: null, ownProjectId: null, updatedAt: now };
    const taskId = this.task.id!;
    this.task = { ...this.task, category: value as any, projectId: null, projecttaged: null, clientId: null, ownProjectId: null, updatedAt: now };
    this.addHistoryEntry(`changed category to ${value}`);
    this.firestore.collection('tasks').doc(taskId).update(update)
      .then(() => this.showNotification('Category saved', 'success'))
      .catch(() => this.showNotification('Error saving category', 'error'));
  }

  /** Saves the selected project (client or own project). */
  saveProjectSelection(projectId: string | null, extra: { clientId?: string; ownProjectId?: string } = {}): void {
    if (!this.task?.id) return;
    const now = new Date();
    const update: any = { projectId, projecttaged: projectId, updatedAt: now };
    const localPatch: any = { projectId, projecttaged: projectId, updatedAt: now };
    if (extra.clientId !== undefined) { update['clientId'] = extra.clientId; localPatch['clientId'] = extra.clientId; }
    if (extra.ownProjectId !== undefined) { update['ownProjectId'] = extra.ownProjectId; localPatch['ownProjectId'] = extra.ownProjectId; }
    const taskId = this.task.id!;
    const proj = [...this.clientProjects, ...this.ownProjects, ...this.projects].find(p => p.id === projectId);
    this.addHistoryEntry(`changed project to ${proj?.name || projectId || 'none'}`);
    this.task = { ...this.task, ...localPatch };
    this.firestore.collection('tasks').doc(taskId).update(update)
      .then(() => this.showNotification('Project saved', 'success'))
      .catch(() => this.showNotification('Error saving project', 'error'));
  }

  private reloadTask(id: string): void {
    this.firestore.collection('tasks').doc(id).get().subscribe({
      next: (doc) => {
        if (doc.exists) {
          const raw = (doc.data() || {}) as any;
          this.task = this.transformLegacyTask({ id: doc.id, ...raw });
        }
      }
    });
  }

  loadTask(id: string): void {
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

  private loadComments(taskId: string): void {
    this.firestore
      .collection('tasks').doc(taskId)
      .collection('comments', ref => ref.orderBy('createdAt', 'asc'))
      .valueChanges({ idField: 'id' })
      .subscribe((docs: any[]) => {
        this.comments = docs.map(d => ({
          id: d.id,
          authorName: d.authorName || 'Unknown',
          authorId: d.authorId || '',
          text: d.text || '',
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt || Date.now())
        }));
      });
  }

  postComment(): void {
    const text = this.newComment.trim();
    if (!text || !this.task?.id) return;
    this.newComment = '';
    this.firestore.collection('tasks').doc(this.task.id)
      .collection('comments').add({
        text,
        authorName: 'You',
        authorId: 'current-user',
        createdAt: new Date()
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
      startDate: this.convertTimestampToDate(task.startDate) ?? undefined,
      dueDate: this.convertTimestampToDate(task.dueDate) ?? undefined,
      tags: task.tags || [],
      assigns: task.assigns,
      projecttaged: task.projecttaged,
      createdby: task.createdby,
      createdbyid: task.createdbyid,
      category: task.category || (task.source === 'ownProject' ? 'ownProject' : (task.clientId ? 'clientProject' : 'general'))
    } as Task;
  }

  // ——— Getters ———
  getTaskTitle(): string {
    return this.task?.title || this.task?.task || 'Untitled Task';
  }

  getTaskDescription(): string {
    return this.task?.description || this.task?.remarks || '';
  }

  getSelectedAssigneeIds(): string[] {
    if (!this.task) return [];
    if (this.task.assigns && this.task.assigns.length > 0) return this.task.assigns.map(a => a.uid);
    return this.task.assignees || [];
  }

  getTaskAssigneeNames(): string[] {
    if (!this.task) return [];
    if (this.task.assigns && this.task.assigns.length > 0) return this.task.assigns.map(a => a.name || 'Unknown');
    if (this.task.assignees && this.task.assignees.length > 0) {
      return this.task.assignees.map(id => this.assignees.find(a => a.id === id)?.name || id);
    }
    return [];
  }

  isAssigned(assigneeId: string): boolean {
    return this.getSelectedAssigneeIds().includes(assigneeId);
  }

  toggleAssignee(assigneeId: string): void {
    const current = this.getSelectedAssigneeIds();
    const next = current.includes(assigneeId)
      ? current.filter(id => id !== assigneeId)
      : [...current, assigneeId];
    this.saveField('assignees', next);
  }

  getProjectName(): string {
    if (!this.task) return '';
    const cat = this.getTaskCategory();
    if (cat === 'ownProject') {
      const id = this.task.ownProjectId || this.task.projectId || this.task.projecttaged;
      if (!id) return '';
      if (this.task.projectName) return this.task.projectName;
      return this.ownProjects.find(p => p.id === id)?.name || id;
    }
    const projectId = this.task.projectId || this.task.projecttaged;
    if (!projectId) return '';
    const allProjects = [...this.clientProjects, ...this.projects];
    return allProjects.find(p => p.id === projectId)?.name || projectId;
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

  // ——— Inline edit ———
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
    // Optimistic local update — no reload, no spinner
    this.task = { ...this.task, title, task: title, updatedAt: new Date() };
    this.addHistoryEntry('updated title');
    this.firestore.collection('tasks').doc(this.task.id).update({
      title, task: title, updatedAt: new Date()
    }).then(() => {
      this.showNotification('Title saved', 'success');
    }).catch(() => this.showNotification('Error saving title', 'error'));
  }

  saveDescription(): void {
    if (!this.task?.id) return;
    const description = this.editDescValue ?? this.getTaskDescription();
    this.editingField = null;
    this.task = { ...this.task, description, remarks: description, updatedAt: new Date() };
    this.addHistoryEntry('updated description');
    this.firestore.collection('tasks').doc(this.task.id).update({
      description, remarks: description, updatedAt: new Date()
    }).then(() => {
      this.showNotification('Description saved', 'success');
    }).catch(() => this.showNotification('Error saving description', 'error'));
  }

  // ——— Generic field save ———
  /** Live preview while dragging — updates local value + CSS var, no DB write */
  onProgressSliderInput(event: Event): void {
    if (!this.task) return;
    const el = event.target as HTMLInputElement;
    const pct = parseInt(el.value, 10);
    el.style.setProperty('--prog', String(pct));
    this.task = { ...this.task, progress: pct };
  }

  /** Persist on mouse/touch release */
  onProgressSliderChange(event: Event): void {
    const pct = parseInt((event.target as HTMLInputElement).value, 10);
    this.saveProgress(pct);
  }

  onProgressInputChange(event: Event): void {
    const raw = parseInt((event.target as HTMLInputElement).value, 10);
    const pct = isNaN(raw) ? 0 : Math.min(100, Math.max(0, raw));
    (event.target as HTMLInputElement).value = String(pct);
    this.saveProgress(pct);
  }

  private saveProgress(pct: number): void {
    if (!this.task?.id) return;
    this.task = { ...this.task, progress: pct, updatedAt: new Date() };
    this.addHistoryEntry(`set progress to ${pct}%`);
    this.firestore.collection('tasks').doc(this.task.id!).update({ progress: pct, updatedAt: new Date() })
      .catch(() => this.showNotification('Error saving progress', 'error'));
  }

  saveField(field: string, value: any): void {
    if (!this.task?.id) return;
    const now = new Date();
    const update: any = { [field]: value, updatedAt: now };

    // Patch local task immediately — no reload, no spinner
    const localPatch: any = { [field]: value, updatedAt: now };
    if (field === 'projectId') {
      update['projecttaged'] = value;
      localPatch['projecttaged'] = value;
    }
    if (field === 'assignees') {
      const assigns = (value as string[]).map(id => {
        const a = this.assignees.find(x => x.id === id);
        return { uid: id, name: a?.name || id };
      });
      update['assigns'] = assigns;
      localPatch['assigns'] = assigns;
    }
    const taskId = this.task.id!;
    this.task = { ...this.task, ...localPatch };
    this.addHistoryEntry(`changed ${field} to ${Array.isArray(value) ? value.join(', ') : value}`);
    this.firestore.collection('tasks').doc(taskId).update(update)
      .then(() => this.showNotification('Saved', 'success'))
      .catch(() => this.showNotification('Error saving', 'error'));
  }

  saveStartDate(value: Date | string | null): void {
    if (!this.task?.id) return;
    const startDate = value ? new Date(value as any) : undefined;
    this.task = { ...this.task, startDate, updatedAt: new Date() };
    this.addHistoryEntry(`set start date to ${startDate ? startDate.toLocaleDateString() : 'none'}`);
    this.firestore.collection('tasks').doc(this.task.id).update({
      startDate: startDate || null,
      updatedAt: new Date()
    }).then(() => this.showNotification('Start date saved', 'success'))
      .catch(() => this.showNotification('Error saving start date', 'error'));
  }

  saveDueDate(value: Date | string | null): void {
    if (!this.task?.id) return;
    const dueDate = value ? new Date(value as any) : undefined;
    this.task = { ...this.task, dueDate, updatedAt: new Date() };
    this.addHistoryEntry(`set due date to ${dueDate ? dueDate.toLocaleDateString() : 'none'}`);
    this.firestore.collection('tasks').doc(this.task.id).update({
      dueDate: dueDate || null,
      updatedAt: new Date()
    }).then(() => this.showNotification('Due date saved', 'success'))
      .catch(() => this.showNotification('Error saving due date', 'error'));
  }

  clearStartDate(): void {
    this.saveStartDate(null);
  }

  clearDueDate(): void {
    this.saveDueDate(null);
  }

  // ——— Attachments ———
  private loadAttachments(taskId: string): void {
    this.firestore
      .collection('tasks').doc(taskId)
      .collection('attachments', ref => ref.orderBy('createdAt', 'desc'))
      .valueChanges({ idField: 'id' })
      .subscribe((docs: any[]) => {
        this.attachments = docs.map(d => ({
          id: d.id,
          name: d.name || 'Unnamed',
          url: d.url || '',
          fileref: d.fileref || '',
          format: d.format || '',
          size: d.size || '',
          uploadedBy: d.uploadedBy || '',
          uploadedByName: d.uploadedByName || 'Unknown',
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt || Date.now())
        }));
      });
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files?.length) {
      Array.from(files).forEach(f => this.uploadFile(f));
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files?.length) {
      Array.from(files).forEach(f => this.uploadFile(f));
    }
  }

  uploadFile(file: File): void {
    if (!this.task?.id) return;
    if (file.size > 20 * 1024 * 1024) {
      this.showNotification('File must be under 20 MB', 'error');
      return;
    }
    const taskId = this.task.id;
    this.isUploading = true;
    this.uploadProgress = 0;
    const filePath = `tasks/${taskId}/attachments/${Date.now()}_${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, file);

    uploadTask.percentageChanges().subscribe(pct => {
      this.uploadProgress = Math.round(pct ?? 0);
    });

    uploadTask.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe(url => {
          const meta = {
            name: file.name,
            url,
            fileref: filePath,
            format: this.getFileExtension(file.name),
            size: this.formatFileSize(file.size),
            uploadedBy: localStorage.getItem('userid') || '',
            uploadedByName: localStorage.getItem('username') || 'You',
            createdAt: new Date()
          };
          this.firestore.collection('tasks').doc(taskId)
            .collection('attachments').add(meta)
            .then(() => {
              this.isUploading = false;
              this.uploadProgress = 0;
              this.addHistoryEntry(`attached "${file.name}"`);
              this.showNotification('File uploaded', 'success');
            })
            .catch(() => {
              this.isUploading = false;
              this.showNotification('Upload failed', 'error');
            });
        });
      })
    ).subscribe();
  }

  deleteAttachment(att: TaskAttachment): void {
    if (!this.task?.id || !att.id) return;
    if (!confirm(`Delete "${att.name}"?`)) return;
    const taskId = this.task.id;
    this.firestore.collection('tasks').doc(taskId)
      .collection('attachments').doc(att.id).delete()
      .then(() => {
        if (att.fileref) {
          this.storage.ref(att.fileref).delete().subscribe({ next: () => {}, error: () => {} });
        }
        this.addHistoryEntry(`deleted attachment "${att.name}"`);
        this.showNotification('Attachment deleted', 'success');
      })
      .catch(() => this.showNotification('Delete failed', 'error'));
  }

  downloadAttachment(att: TaskAttachment): void {
    const link = document.createElement('a');
    link.href = att.url;
    link.target = '_blank';
    link.download = att.name;
    link.click();
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  getFileIcon(format: string): string {
    const ext = (format || '').toLowerCase();
    const map: Record<string, string[]> = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
      description: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
      table_chart: ['xls', 'xlsx', 'csv', 'ods'],
      slideshow: ['ppt', 'pptx', 'odp'],
      folder_zip: ['zip', 'rar', '7z', 'tar', 'gz'],
      code: ['js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java'],
      video_file: ['mp4', 'avi', 'mov', 'webm'],
      audiotrack: ['mp3', 'wav', 'flac', 'aac']
    };
    for (const [icon, exts] of Object.entries(map)) {
      if (exts.includes(ext)) return icon;
    }
    return 'insert_drive_file';
  }

  getFileIconColor(format: string): string {
    const ext = (format || '').toLowerCase();
    const colorMap: Record<string, string[]> = {
      '#4caf50': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'xls', 'xlsx', 'csv'],
      '#2196f3': ['pdf', 'doc', 'docx', 'txt', 'rtf'],
      '#ff9800': ['ppt', 'pptx'],
      '#9c27b0': ['zip', 'rar', '7z', 'tar', 'gz'],
      '#607d8b': ['js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java'],
      '#f44336': ['mp4', 'avi', 'mov', 'webm'],
      '#e91e63': ['mp3', 'wav', 'flac', 'aac']
    };
    for (const [color, exts] of Object.entries(colorMap)) {
      if (exts.includes(ext)) return color;
    }
    return '#78909c';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  isImageFile(format: string): boolean {
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes((format || '').toLowerCase());
  }

  private loadHistory(taskId: string): void {
    this.firestore
      .collection('tasks').doc(taskId)
      .collection('history', ref => ref.orderBy('time', 'desc'))
      .valueChanges({ idField: 'id' })
      .subscribe((docs: any[]) => {
        this.history = docs.map(d => ({
          who: d.who || 'Unknown',
          action: d.action || '',
          time: d.time?.toDate ? d.time.toDate() : new Date(d.time || Date.now())
        }));
      });
  }

  private async addHistoryEntry(action: string): Promise<void> {
    if (!this.task?.id) return;
    const user = await this.auth.currentUser;
    const who = user?.displayName || user?.email || 'Unknown';
    await this.firestore
      .collection('tasks').doc(this.task.id)
      .collection('history').add({
        who,
        action,
        time: new Date()
      });
  }

  onBack(): void {
    this.router.navigate(['/admin', 'tasks']);
  }

  onDelete(): void {
    if (!this.task?.id) return;
    if (!confirm('Are you sure you want to delete this task?')) return;
    this.firestore.collection('tasks').doc(this.task.id).delete().then(() => {
      this.showNotification('Task deleted!', 'success');
      this.router.navigate(['/admin', 'tasks']);
    }).catch(() => this.showNotification('Error deleting task', 'error'));
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: [`snackbar-${type}`] });
  }
}
