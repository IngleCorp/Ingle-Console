import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectMilestonesComponent } from './project-milestones.component';

describe('ProjectMilestonesComponent', () => {
  let component: ProjectMilestonesComponent;
  let fixture: ComponentFixture<ProjectMilestonesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectMilestonesComponent ],
      imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatSliderModule,
        MatButtonToggleModule,
        MatProgressBarModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTooltipModule,
        MatProgressSpinnerModule
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectMilestonesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.selectedView).toBe('list');
    expect(component.selectedStatusFilter).toBe('');
    expect(component.selectedTypeFilter).toBe('');
    expect(component.selectedPriorityFilter).toBe('');
    expect(component.isLoading).toBe(false);
    expect(component.isDialogOpen).toBe(false);
    expect(component.isEditMode).toBe(false);
  });

  it('should have milestone types defined', () => {
    expect(component.milestoneTypes.length).toBeGreaterThan(0);
    expect(component.milestoneTypes[0].value).toBeDefined();
    expect(component.milestoneTypes[0].label).toBeDefined();
    expect(component.milestoneTypes[0].icon).toBeDefined();
  });

  it('should have milestone priorities defined', () => {
    expect(component.milestonePriorities.length).toBeGreaterThan(0);
    expect(component.milestonePriorities[0].value).toBeDefined();
    expect(component.milestonePriorities[0].label).toBeDefined();
    expect(component.milestonePriorities[0].color).toBeDefined();
  });

  it('should have milestone statuses defined', () => {
    expect(component.milestoneStatuses.length).toBeGreaterThan(0);
    expect(component.milestoneStatuses[0].value).toBeDefined();
    expect(component.milestoneStatuses[0].label).toBeDefined();
    expect(component.milestoneStatuses[0].color).toBeDefined();
  });

  it('should initialize milestone form', () => {
    expect(component.milestoneForm).toBeDefined();
    expect(component.milestoneForm.get('title')).toBeDefined();
    expect(component.milestoneForm.get('description')).toBeDefined();
    expect(component.milestoneForm.get('deadline')).toBeDefined();
    expect(component.milestoneForm.get('type')).toBeDefined();
    expect(component.milestoneForm.get('priority')).toBeDefined();
    expect(component.milestoneForm.get('status')).toBeDefined();
    expect(component.milestoneForm.get('progress')).toBeDefined();
    expect(component.milestoneForm.get('owner')).toBeDefined();
  });

  it('should open add milestone dialog', () => {
    component.openAddMilestoneDialog();
    expect(component.isDialogOpen).toBe(true);
    expect(component.isEditMode).toBe(false);
    expect(component.editingMilestoneId).toBe('');
  });

  it('should close dialog', () => {
    component.isDialogOpen = true;
    component.closeDialog();
    expect(component.isDialogOpen).toBe(false);
  });

  it('should format date correctly', () => {
    const testDate = new Date('2024-01-15');
    const formatted = component.formatDate(testDate);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('should calculate days until deadline', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const days = component.getDaysUntilDeadline(futureDate);
    expect(days).toBe(5);
  });

  it('should get milestone health correctly', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    
    const milestone = {
      deadline: futureDate,
      progress: 50
    } as any;
    
    const health = component.getMilestoneHealth(milestone);
    expect(health).toBe('on-track');
  });

  it('should get milestone type icon', () => {
    const icon = component.getMilestoneTypeIcon('project');
    expect(icon).toBe('flag');
  });

  it('should get milestone type label', () => {
    const label = component.getMilestoneTypeLabel('project');
    expect(label).toBe('Project Milestone');
  });

  it('should get priority color', () => {
    const color = component.getPriorityColor('high');
    expect(color).toBe('#f97316');
  });

  it('should get status color', () => {
    const color = component.getStatusColor('completed');
    expect(color).toBe('#10b981');
  });

  it('should get status label', () => {
    const label = component.getStatusLabel('completed');
    expect(label).toBe('Completed');
  });
}); 