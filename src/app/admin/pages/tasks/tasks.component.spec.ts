import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';

import { TasksComponent } from './tasks.component';

describe('TasksComponent', () => {
  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;

  const mockFirebaseConfig = {
    apiKey: 'test-api-key',
    authDomain: 'test-domain.firebaseapp.com',
    projectId: 'test-project-id',
    storageBucket: 'test-bucket.appspot.com',
    messagingSenderId: '123456789',
    appId: 'test-app-id'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TasksComponent ],
      imports: [
        ReactiveFormsModule,
        MatSnackBarModule,
        MatDialogModule,
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressBarModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        ClipboardModule,
        BrowserAnimationsModule,
        AngularFireModule.initializeApp(mockFirebaseConfig),
        AngularFirestoreModule,
        AngularFireAuthModule
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty task lists', () => {
    expect(component.todoTasks).toEqual([]);
    expect(component.inProgressTasks).toEqual([]);
    expect(component.doneTasks).toEqual([]);
    expect(component.holdTasks).toEqual([]);
  });

  it('should have correct priorities defined', () => {
    expect(component.priorities).toHaveLength(4);
    expect(component.priorities[0].value).toBe('low');
    expect(component.priorities[1].value).toBe('medium');
    expect(component.priorities[2].value).toBe('high');
    expect(component.priorities[3].value).toBe('urgent');
  });

  it('should have correct statuses defined', () => {
    expect(component.statuses).toHaveLength(4);
    expect(component.statuses[0].value).toBe('todo');
    expect(component.statuses[1].value).toBe('in-progress');
    expect(component.statuses[2].value).toBe('done');
    expect(component.statuses[3].value).toBe('hold');
  });

  it('should have assignees defined', () => {
    expect(component.assignees).toHaveLength(3);
    expect(component.assignees[0].name).toBe('Jasmal');
    expect(component.assignees[1].name).toBe('Ramshin');
    expect(component.assignees[2].name).toBe('Ajmal');
  });

  it('should create form with correct default values', () => {
    expect(component.taskForm.get('priority')?.value).toBe('medium');
    expect(component.taskForm.get('status')?.value).toBe('todo');
    expect(component.taskForm.get('assignees')?.value).toEqual([]);
    expect(component.taskForm.get('isActive')?.value).toBe(true);
  });

  it('should validate required fields', () => {
    const titleControl = component.taskForm.get('title');
    expect(titleControl?.valid).toBeFalsy();
    
    titleControl?.setValue('Test Task');
    expect(titleControl?.valid).toBeTruthy();
  });

  it('should get priority color correctly', () => {
    expect(component.getPriorityColor('low')).toBe('#10b981');
    expect(component.getPriorityColor('medium')).toBe('#f59e0b');
    expect(component.getPriorityColor('high')).toBe('#ef4444');
    expect(component.getPriorityColor('urgent')).toBe('#dc2626');
    expect(component.getPriorityColor('unknown')).toBe('#6b7280');
  });

  it('should get status color correctly', () => {
    expect(component.getStatusColor('todo')).toBe('#6b7280');
    expect(component.getStatusColor('in-progress')).toBe('#3b82f6');
    expect(component.getStatusColor('done')).toBe('#10b981');
    expect(component.getStatusColor('hold')).toBe('#f59e0b');
    expect(component.getStatusColor('unknown')).toBe('#6b7280');
  });

  it('should get assignee names correctly', () => {
    const assigneeIds = ['1', '2'];
    const names = component.getAssigneeNames(assigneeIds);
    expect(names).toEqual(['Jasmal', 'Ramshin']);
  });

  it('should get project name correctly', () => {
    expect(component.getProjectName('1')).toBe('Project Alpha');
    expect(component.getProjectName('2')).toBe('Project Beta');
    expect(component.getProjectName('unknown')).toBe('Unknown Project');
  });

  it('should reset form correctly', () => {
    component.taskForm.patchValue({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'high',
      status: 'done'
    });

    component.resetForm();

    expect(component.taskForm.get('title')?.value).toBe('');
    expect(component.taskForm.get('priority')?.value).toBe('medium');
    expect(component.taskForm.get('status')?.value).toBe('todo');
    expect(component.isAddingTask).toBe(false);
    expect(component.isEditing).toBe(false);
    expect(component.editingTaskId).toBeNull();
  });

  it('should categorize tasks correctly', () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', status: 'todo' },
      { id: '2', title: 'Task 2', status: 'in-progress' },
      { id: '3', title: 'Task 3', status: 'done' },
      { id: '4', title: 'Task 4', status: 'hold' }
    ];

    component.tasks = mockTasks;
    component.categorizeTasks();

    expect(component.todoTasks).toHaveLength(1);
    expect(component.inProgressTasks).toHaveLength(1);
    expect(component.doneTasks).toHaveLength(1);
    expect(component.holdTasks).toHaveLength(1);
  });
}); 