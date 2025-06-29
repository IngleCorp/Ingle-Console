import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

interface Milestone {
  id?: string;
  title: string;
  description: string;
  deadline: Date;
  type: 'project' | 'phase' | 'release' | 'deliverable' | 'review' | 'custom';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not-started' | 'in-progress' | 'completed' | 'delayed' | 'cancelled';
  progress: number; // 0-100
  owner: string;
  stakeholders: string[];
  dependencies: string[]; // IDs of dependent milestones
  tasks?: string[]; // IDs of related tasks (optional)
  createdAt?: Date;
  createdBy?: string;
  createdByName?: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedByName?: string;
  completedAt?: Date;
  notes?: string;
  tags?: string[];
}

@Component({
  selector: 'app-project-milestones',
  templateUrl: './project-milestones.component.html',
  styleUrls: ['./project-milestones.component.scss']
})
export class ProjectMilestonesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  projectId: string = '';
  milestones: Milestone[] = [];
  isLoading = false;
  selectedView: 'list' | 'timeline' | 'calendar' = 'list';
  selectedStatusFilter = '';
  selectedTypeFilter = '';
  selectedPriorityFilter = '';
  
  // Form for adding/editing milestones
  milestoneForm: FormGroup;
  isDialogOpen = false;
  isEditMode = false;
  editingMilestoneId: string = '';

  // Milestone types and priorities
  milestoneTypes = [
    { value: 'project', label: 'Project Milestone', icon: 'flag' },
    { value: 'phase', label: 'Phase Milestone', icon: 'layers' },
    { value: 'release', label: 'Release Milestone', icon: 'rocket_launch' },
    { value: 'deliverable', label: 'Deliverable', icon: 'assignment_turned_in' },
    { value: 'review', label: 'Review Point', icon: 'rate_review' },
    { value: 'custom', label: 'Custom', icon: 'edit' }
  ];

  milestonePriorities = [
    { value: 'critical', label: 'Critical', color: '#ef4444' },
    { value: 'high', label: 'High', color: '#f97316' },
    { value: 'medium', label: 'Medium', color: '#eab308' },
    { value: 'low', label: 'Low', color: '#22c55e' }
  ];

  milestoneStatuses = [
    { value: 'not-started', label: 'Not Started', color: '#6b7280' },
    { value: 'in-progress', label: 'In Progress', color: '#3b82f6' },
    { value: 'completed', label: 'Completed', color: '#10b981' },
    { value: 'delayed', label: 'Delayed', color: '#ef4444' },
    { value: 'cancelled', label: 'Cancelled', color: '#6b7280' }
  ];

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.milestoneForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      deadline: ['', Validators.required],
      type: ['project', Validators.required],
      priority: ['medium', Validators.required],
      status: ['not-started', Validators.required],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      owner: ['', Validators.required],
      stakeholders: [''],
      dependencies: [''],
      notes: [''],
      tags: ['']
    });
  }

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') || '';
    this.loadMilestones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMilestones(): void {
    this.isLoading = true;
    
    this.afs.collection('projects')
      .doc(this.projectId)
      .collection('milestones', ref => ref.orderBy('deadline', 'asc'))
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (milestones: any) => {
          this.milestones = milestones || [];
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading milestones:', error);
          this.isLoading = false;
          this.showNotification('Error loading milestones', 'error');
        }
      });
  }

  get filteredMilestones(): Milestone[] {
    let filtered = this.milestones;

    if (this.selectedStatusFilter) {
      filtered = filtered.filter(milestone => milestone.status === this.selectedStatusFilter);
    }

    if (this.selectedTypeFilter) {
      filtered = filtered.filter(milestone => milestone.type === this.selectedTypeFilter);
    }

    if (this.selectedPriorityFilter) {
      filtered = filtered.filter(milestone => milestone.priority === this.selectedPriorityFilter);
    }

    return filtered;
  }

  get upcomingMilestones(): Milestone[] {
    const now = new Date();
    return this.milestones.filter(milestone => {
      const deadline = milestone.deadline instanceof Date ? milestone.deadline : 
                      (milestone.deadline as any)?.toDate ? (milestone.deadline as any).toDate() : 
                      new Date(milestone.deadline);
      return deadline >= now && milestone.status !== 'completed' && milestone.status !== 'cancelled';
    }).slice(0, 5);
  }

  get overdueMilestones(): Milestone[] {
    const now = new Date();
    return this.milestones.filter(milestone => {
      const deadline = milestone.deadline instanceof Date ? milestone.deadline : 
                      (milestone.deadline as any)?.toDate ? (milestone.deadline as any).toDate() : 
                      new Date(milestone.deadline);
      return deadline < now && milestone.status !== 'completed' && milestone.status !== 'cancelled';
    });
  }

  get completedMilestones(): Milestone[] {
    return this.milestones.filter(milestone => milestone.status === 'completed');
  }

  openAddMilestoneDialog(): void {
    this.isEditMode = false;
    this.editingMilestoneId = '';
    this.milestoneForm.reset({
      type: 'project',
      priority: 'medium',
      status: 'not-started',
      progress: 0
    });
    this.isDialogOpen = true;
  }

  openEditMilestoneDialog(milestone: Milestone): void {
    this.isEditMode = true;
    this.editingMilestoneId = milestone.id || '';
    
    // Convert Firestore timestamp to Date if needed
    const deadline = milestone.deadline instanceof Date ? milestone.deadline : 
                    (milestone.deadline as any)?.toDate ? (milestone.deadline as any).toDate() : 
                    new Date(milestone.deadline);
    
    this.milestoneForm.patchValue({
      title: milestone.title,
      description: milestone.description,
      deadline: deadline,
      type: milestone.type,
      priority: milestone.priority,
      status: milestone.status,
      progress: milestone.progress,
      owner: milestone.owner,
      stakeholders: milestone.stakeholders?.join(', ') || '',
      dependencies: milestone.dependencies?.join(', ') || '',
      notes: milestone.notes || '',
      tags: milestone.tags?.join(', ') || ''
    });
    
    this.isDialogOpen = true;
  }

  saveMilestone(): void {
    if (this.milestoneForm.invalid) return;

    const value = this.milestoneForm.value;
    
    // Process arrays
    const stakeholders = value.stakeholders ? 
      value.stakeholders.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
    const dependencies = value.dependencies ? 
      value.dependencies.split(',').map((d: string) => d.trim()).filter((d: string) => d) : [];
    const tags = value.tags ? 
      value.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];

    const milestoneData: Milestone = {
      title: value.title,
      description: value.description,
      deadline: value.deadline,
      type: value.type,
      priority: value.priority,
      status: value.status,
      progress: value.progress,
      owner: value.owner,
      stakeholders: stakeholders,
      dependencies: dependencies,
      tasks: [], // Initialize as empty array
      notes: value.notes,
      tags: tags,
      updatedAt: new Date(),
      updatedBy: localStorage.getItem('uid') || '',
      updatedByName: localStorage.getItem('name') || ''
    };

    if (this.isEditMode) {
      // Update existing milestone
      this.afs.collection('projects')
        .doc(this.projectId)
        .collection('milestones')
        .doc(this.editingMilestoneId)
        .update(milestoneData)
        .then(() => {
          this.showNotification('Milestone updated successfully', 'success');
          this.closeDialog();
        })
        .catch((error: any) => {
          console.error('Error updating milestone:', error);
          this.showNotification('Error updating milestone', 'error');
        });
    } else {
      // Create new milestone
      milestoneData.createdAt = new Date();
      milestoneData.createdBy = localStorage.getItem('uid') || '';
      milestoneData.createdByName = localStorage.getItem('name') || '';
      
      this.afs.collection('projects')
        .doc(this.projectId)
        .collection('milestones')
        .add(milestoneData)
        .then(() => {
          this.showNotification('Milestone created successfully', 'success');
          this.closeDialog();
        })
        .catch((error: any) => {
          console.error('Error creating milestone:', error);
          this.showNotification('Error creating milestone', 'error');
        });
    }
  }

  updateMilestoneStatus(milestoneId: string, status: string): void {
    const updateData: any = {
      status: status,
      updatedAt: new Date(),
      updatedBy: localStorage.getItem('uid') || '',
      updatedByName: localStorage.getItem('name') || ''
    };

    if (status === 'completed') {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    this.afs.collection('projects')
      .doc(this.projectId)
      .collection('milestones')
      .doc(milestoneId)
      .update(updateData)
      .then(() => {
        this.showNotification('Milestone status updated successfully', 'success');
      })
      .catch((error: any) => {
        console.error('Error updating milestone status:', error);
        this.showNotification('Error updating milestone status', 'error');
      });
  }

  updateMilestoneProgress(milestoneId: string, progress: number): void {
    let status = 'in-progress';
    if (progress === 0) status = 'not-started';
    if (progress === 100) status = 'completed';

    this.afs.collection('projects')
      .doc(this.projectId)
      .collection('milestones')
      .doc(milestoneId)
      .update({
        progress: progress,
        status: status,
        updatedAt: new Date(),
        updatedBy: localStorage.getItem('uid') || '',
        updatedByName: localStorage.getItem('name') || ''
      })
      .then(() => {
        this.showNotification('Milestone progress updated successfully', 'success');
      })
      .catch((error: any) => {
        console.error('Error updating milestone progress:', error);
        this.showNotification('Error updating milestone progress', 'error');
      });
  }

  onProgressChange(event: any, milestoneId: string): void {
    const value = parseInt(event.target.value, 10);
    this.updateMilestoneProgress(milestoneId, value);
  }

  deleteMilestone(milestoneId: string): void {
    if (confirm('Are you sure you want to delete this milestone?')) {
      this.afs.collection('projects')
        .doc(this.projectId)
        .collection('milestones')
        .doc(milestoneId)
        .delete()
        .then(() => {
          this.showNotification('Milestone deleted successfully', 'success');
        })
        .catch((error: any) => {
          console.error('Error deleting milestone:', error);
          this.showNotification('Error deleting milestone', 'error');
        });
    }
  }

  closeDialog(): void {
    this.isDialogOpen = false;
    this.milestoneForm.reset();
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysUntilDeadline(deadline: any): number {
    if (!deadline) return 0;
    const d = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getMilestoneHealth(milestone: Milestone): 'on-track' | 'at-risk' | 'delayed' {
    const daysUntilDeadline = this.getDaysUntilDeadline(milestone.deadline);
    const progress = milestone.progress;
    
    if (daysUntilDeadline < 0) return 'delayed';
    if (daysUntilDeadline <= 7 && progress < 75) return 'at-risk';
    return 'on-track';
  }

  getMilestoneTypeIcon(type: string): string {
    const milestoneType = this.milestoneTypes.find(t => t.value === type);
    return milestoneType?.icon || 'flag';
  }

  getMilestoneTypeLabel(type: string): string {
    const milestoneType = this.milestoneTypes.find(t => t.value === type);
    return milestoneType?.label || 'Custom';
  }

  getPriorityColor(priority: string): string {
    const priorityItem = this.milestonePriorities.find(p => p.value === priority);
    return priorityItem?.color || '#6b7280';
  }

  getStatusColor(status: string): string {
    const statusItem = this.milestoneStatuses.find(s => s.value === status);
    return statusItem?.color || '#6b7280';
  }

  getStatusLabel(status: string): string {
    const statusItem = this.milestoneStatuses.find(s => s.value === status);
    return statusItem?.label || 'Unknown';
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }
} 