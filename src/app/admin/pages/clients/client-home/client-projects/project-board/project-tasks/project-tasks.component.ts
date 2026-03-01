import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TimetakenComponent } from './timetaken/timetaken.component';
import { ProjectTaskFormComponent, ProjectTaskFormData } from './project-task-form/project-task-form.component';
import { ProjectTaskViewComponent, ProjectTaskViewData } from './project-task-view/project-task-view.component';
import {
  Task,
  TaskAssigneeRef,
  getTaskTitle as modelGetTaskTitle,
  getTaskCreatedBy as modelGetTaskCreatedBy,
  PRIORITY_COLORS,
  TASK_STATUSES,
  TASK_PRIORITIES
} from '../../../../../tasks/task.model';

interface TaskAssignee {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

// import { ToastrService } from 'ngx-toastr'; // Uncomment if available
// import { AssignComponent } from '...'; // Uncomment if available

@Component({
  selector: 'app-project-tasks',
  templateUrl: './project-tasks.component.html',
  styleUrls: ['./project-tasks.component.scss']
})
export class ProjectTasksComponent implements OnInit {
  taskdata: any[] = [];
  task: string = '';
  projectId: string | null = null;
  clientId: string | null = null;
  projectname: string = '';
  tasktodo: any[] = [];
  taskinprogress: any[] = [];
  taskdone: any[] = [];
  taskonhold: any[] = [];
  buffervalue: number = 75;

  priorities = TASK_PRIORITIES;
  statuses = TASK_STATUSES;

  assignees: TaskAssignee[] = [
    { id: '1', name: 'Jasmal', email: 'jasmal@example.com' },
    { id: '2', name: 'Ramshin', email: 'ramshin@example.com' },
    { id: '3', name: 'Ajmal', email: 'ajmal@example.com' }
  ];

  projects: Project[] = [];
  constructor(
    private dialog: MatDialog,
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    localStorage.setItem('pactivetab', 'tasks');
    this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId');
      this.clientId = this.route.parent?.parent?.snapshot?.paramMap?.get('id') ?? null;
      this.getTasks();
      this.loadProjects();
      if (this.projectId) {
        this.afs.collection('projects').doc(this.projectId).valueChanges().subscribe((res: any) => {
          this.projectname = res?.name;
        });
      }
    });
  }

  private loadProjects(): void {
    this.afs.collection('projects').valueChanges({ idField: 'id' }).subscribe((projects: any[]) => {
      this.projects = projects.map(project => ({
        id: project.id,
        name: project.name || 'Unnamed Project'
      }));
    });
  }

  getTasks(): void {
    if (!this.projectId) return;
    this.afs.collection('tasks', ref =>
      ref.where('projecttaged', '==', this.projectId).orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' }).subscribe((res: any) => {
      this.applyTaskData(res || []);
    });
  }

  private applyTaskData(res: any[]): void {
    this.taskdata = res || [];
    this.tasktodo = this.taskdata.filter((x: any) => (x.status || 'todo') === 'todo');
    this.taskinprogress = this.taskdata.filter((x: any) => x.status === 'in-progress');
    this.taskdone = this.taskdata.filter((x: any) => x.status === 'done');
    this.taskonhold = this.taskdata.filter((x: any) => x.status === 'hold');
  }

  filtertask(filterby: string): void {
    this.tasktodo = this.taskdata.filter((x: any) => (x.status || 'todo') === 'todo');
    if (filterby !== 'all') {
      this.tasktodo = this.tasktodo.filter((x: any) =>
        (x?.assigns || []).some((y: any) => y?.name === filterby)
      );
    }
  }

  returnfiltertask(filterby: string): any[] {
    let list = this.taskdata.filter((x: any) => (x.status || 'todo') === 'todo');
    if (filterby !== 'all') {
      list = list.filter((x: any) => (x?.assigns || []).some((y: any) => y?.name === filterby));
    }
    return list;
  }

  getTaskTitle(task: Partial<Task> | null): string {
    return modelGetTaskTitle(task);
  }

  getTaskCreatedBy(task: Partial<Task> | null): string {
    return modelGetTaskCreatedBy(task);
  }

  getPriorityColor(priority: string | undefined): string {
    return (priority && PRIORITY_COLORS[priority]) || PRIORITY_COLORS['medium'] || '#f59e0b';
  }

  getAssigneesList(task: Partial<Task> | null): TaskAssigneeRef[] {
    if (!task || !(task as any).assigns?.length) return [];
    return (task as any).assigns;
  }

  copyTodoTaskList(): void {
    let users = ['Jasmal', 'Ramshin', 'Ajmal'];
    let timenow = new Date().getDate() + '/' + (new Date().getMonth() + 1) + '/' + new Date().getFullYear() + '  ' + new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds();
    let taskprint = 'Date : ' + timenow + '\n';
    taskprint += 'Project : ' + this.projectname + '\n';
    taskprint += '------------------------------------' + '\n';
    users.forEach(element => {
      let tasklist = this.returnfiltertask(element);
      taskprint += element + '\n';
      taskprint += '------------------------------------' + '\n';
      tasklist.forEach((x: any, i: any) => {
        taskprint += i + 1 + ' : ' + x.task + '\n';
      });
      taskprint += '\n';
    });
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = taskprint;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
    // this.toastr.success('all todo tasks copied to clipboard'); // Uncomment if available
  }

  setProgress(task: any): void {
    if (task.status === 'in-progress') {
      this.afs.doc('tasks/' + task.id).update({ status: 'todo', progress: 0 });
    } else {
      this.afs.doc('tasks/' + task.id).update({ status: 'in-progress', progress: task.progress ?? 0 });
    }
  }

  updateTask(task: any): void {
   // Uncomment and update TimetakenComponent usage if available
    const dia = this.dialog.open(TimetakenComponent, {
      width: '500px',
      disableClose: true,
      data: { task: task }
    });
    dia.afterClosed().subscribe(res => {
      if (res.sts) {
        this.afs.doc('tasks/' + task.id).update({
          status: 'done',
          timeTaken: res.time
        });
        if(res?.worksheet){
          let worksheet = res?.worksheet;
          if(this.projectId) {
          this.afs.collection('projects').doc(this.projectId).collection(worksheet).add({
            task: task.task,
            status: "Completed",
            doneby: localStorage.getItem('username'),
            remarks: 'none',
            time: res.time,
            createdAt: new Date(),
            taskId: task.id,
          });
        }
        }
      }
    });
  }

  holdTask(task: string): void {
    this.afs.doc('tasks/' + task).update({
      status: 'hold'
    });
  }

  undoTask(task: string): void {
    this.afs.doc('tasks/' + task).update({
      status: 'todo'
    });
  }

  removeTask(task: string): void {
    if (confirm('Are you sure?')) {
      this.afs.doc('tasks/' + task).delete();
    }
  }

  addTask(): void {
    if (this.task.length > 0 && this.projectId) {
      const data: any = {
        task: this.task,
        title: this.task,
        description: '',
        status: 'todo',
        priority: 'medium',
        assignees: [],
        assigns: [],
        createdAt: new Date(),
        createdby: localStorage.getItem('username'),
        createdbyid: localStorage.getItem('userid'),
        createdBy: localStorage.getItem('userid'),
        createdByName: localStorage.getItem('username'),
        projectId: this.projectId,
        projecttaged: this.projectId,
        projectname: this.projectname,
        projectName: this.projectname,
        dueDate: null,
        category: 'clientProject',
      };
      if (this.clientId) data.clientId = this.clientId;
      this.afs.collection('tasks').add(data).then(() => {
        this.task = '';
      });
    }
  }

  assignTask(id: string): void {
    // Uncomment and update AssignComponent usage if available
    // const dialogRef = this.dialog.open(AssignComponent, {
    //   data: {
    //     taskId: id,
    //     mode: 'create',
    //   }
    // });
    // dialogRef.afterClosed().subscribe(result => {
    //   // handle result
    // });
  }

  getCreatedDateTooltip(createdAt: any): string {
    if (!createdAt?.seconds) {
      return 'Date not available';
    }
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleString();
  }

  openTaskDetails(taskId: string): void {
    if (!taskId) return;
    this.router.navigate(['/admin', 'tasks', taskId], {
      queryParams: {
        source: 'clientProject',
        projectId: this.projectId,
        clientId: this.clientId
      }
    });
  }

  getCreatedDateDisplay(createdAt: any): string {
    if (!createdAt?.seconds) {
      return 'N/A';
    }
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  // Task dialog and view methods
  openTaskDialog(isEditing: boolean, task?: any): void {
    const dialogData: ProjectTaskFormData = {
      isEditing,
      task: task || undefined,
      projects: this.projects,
      assignees: this.assignees,
      priorities: this.priorities,
      statuses: this.statuses
    };

    const dialogRef = this.dialog.open(ProjectTaskFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: dialogData,
      disableClose: true,
      panelClass: 'task-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (isEditing && task) {
          this.updateTaskFromDialog(task.id, result);
        } else {
          this.addTaskFromDialog(result);
        }
      }
    });
  }

  openTaskView(task: any): void {
    const dialogData: ProjectTaskViewData = {
      task,
      assignees: this.assignees,
      projects: this.projects,
      priorities: this.priorities,
      statuses: this.statuses
    };

    const dialogRef = this.dialog.open(ProjectTaskViewComponent, {
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
          this.removeTask(result.task.id);
        }
      }
    });
  }

  private updateTaskFromDialog(taskId: string, formData: any): void {
    const assigneeIds = formData.assignees || [];
    const assigns = assigneeIds.map((id: string) => {
      const assignee = this.assignees.find(a => a.id === id);
      return assignee ? { uid: id, name: assignee.name } : { uid: id, name: 'Unknown' };
    });
    const updateData: any = {
      task: formData.title,
      title: formData.title,
      description: formData.description,
      priority: formData.priority || 'medium',
      status: formData.status,
      assignees: assigneeIds,
      assigns,
      estimatedHours: formData.estimatedHours,
      dueDate: formData.dueDate,
      tags: formData.tags,
      updatedAt: new Date(),
    };
    this.afs.doc('tasks/' + taskId).update(updateData);
  }

  private addTaskFromDialog(formData: any): void {
    if (!this.projectId) return;
    const assigneeIds = formData.assignees || [];
    const assigns = assigneeIds.map((id: string) => {
      const assignee = this.assignees.find(a => a.id === id);
      return assignee ? { uid: id, name: assignee.name } : { uid: id, name: 'Unknown' };
    });
    const data: any = {
      task: formData.title,
      title: formData.title,
      description: formData.description || '',
      priority: formData.priority || 'medium',
      status: formData.status || 'todo',
      assignees: assigneeIds,
      assigns,
      createdAt: new Date(),
      createdby: localStorage.getItem('username'),
      createdbyid: localStorage.getItem('userid'),
      createdBy: localStorage.getItem('userid'),
      createdByName: localStorage.getItem('username'),
      projectId: this.projectId,
      projecttaged: this.projectId,
      projectname: this.projectname,
      projectName: this.projectname,
      dueDate: formData.dueDate || null,
      estimatedHours: formData.estimatedHours,
      tags: formData.tags,
      category: 'clientProject',
    };
    if (this.clientId) data.clientId = this.clientId;
    this.afs.collection('tasks').add(data);
  }
}
