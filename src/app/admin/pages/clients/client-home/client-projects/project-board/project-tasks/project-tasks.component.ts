import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TimetakenComponent } from './timetaken/timetaken.component';
// Import the project-specific task components
import { ProjectTaskFormComponent, ProjectTaskFormData } from './project-task-form/project-task-form.component';
import { ProjectTaskViewComponent, ProjectTaskViewData } from './project-task-view/project-task-view.component';

// Local interfaces for task management
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
  taskdata: any;
  task: string = '';
  projectId: string | null = null;
  clientId: string | null = null;
  projectname: string = '';
  tasktodo: any;
  taskdone: any;
  taskonhold: any;
  buffervalue: number = 75;

  // Task management data
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
    console.log('Fetching tasks for project ID:', this.projectId);
    if (!this.projectId) return;
    this.afs.collection('tasks', ref => ref.where('projecttaged', '==', this.projectId).orderBy('createdAt', 'desc')).valueChanges({ idField: 'id' }).subscribe((res: any) => {
      this.taskdata = res;
      this.tasktodo = this.taskdata.filter((x: any) => x.status === 'todo');
      this.taskdone = this.taskdata.filter((x: any) => x.status === 'done');
      this.taskonhold = this.taskdata.filter((x: any) => x.status === 'hold');
    });
  }

  filtertask(filterby: string): void {
    this.tasktodo = this.taskdata.filter((x: any) => x.status === 'todo');
    if (filterby != 'all') {
      this.tasktodo = this.tasktodo.filter((x: any) => x?.assigns.filter((y: any) => y.name === filterby).length > 0);
    }
  }

  returnfiltertask(filterby: string): any[] {
    let tasktodo = this.taskdata.filter((x: any) => x.status === 'todo');
    if (filterby != 'all') {
      tasktodo = tasktodo.filter((x: any) => x?.assigns.filter((y: any) => y.name === filterby).length > 0);
    }
    return tasktodo;
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
    let sts;
    if (task.progress) {
      sts = false;
    } else {
      sts = true;
    }
    this.afs.doc('tasks/' + task.id).update({
      progress: sts
    });
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
        createdAt: new Date(),
        status: 'todo',
        createdby: localStorage.getItem('username'),
        createdbyid: localStorage.getItem('userid'),
        createdBy: localStorage.getItem('userid'),
        createdByName: localStorage.getItem('username'),
        projectId: this.projectId,
        projecttaged: this.projectId,
        projectname: this.projectname,
        projectName: this.projectname,
        assigns: [],
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
    const updateData = {
      task: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: formData.status,
      // Convert assignee IDs back to assigns format for compatibility
      assigns: formData.assignees ? formData.assignees.map((id: string) => {
        const assignee = this.assignees.find(a => a.id === id);
        return assignee ? { uid: id, name: assignee.name } : { uid: id, name: 'Unknown' };
      }) : [],
      estimatedHours: formData.estimatedHours,
      dueDate: formData.dueDate,
      tags: formData.tags,
      updatedAt: new Date()
    };

    this.afs.doc('tasks/' + taskId).update(updateData);
  }

  private addTaskFromDialog(formData: any): void {
    if (this.projectId) {
      const data: any = {
        task: formData.title,
        title: formData.title,
        description: formData.description || '',
        priority: formData.priority || 'medium',
        status: formData.status || 'todo',
        createdAt: new Date(),
        createdby: localStorage.getItem('username'),
        createdbyid: localStorage.getItem('userid'),
        createdBy: localStorage.getItem('userid'),
        createdByName: localStorage.getItem('username'),
        projectId: this.projectId,
        projecttaged: this.projectId,
        projectname: this.projectname,
        projectName: this.projectname,
        assigns: formData.assignees ? formData.assignees.map((id: string) => {
          const assignee = this.assignees.find(a => a.id === id);
          return assignee ? { uid: id, name: assignee.name } : { uid: id, name: 'Unknown' };
        }) : [],
        estimatedHours: formData.estimatedHours,
        dueDate: formData.dueDate,
        tags: formData.tags,
        category: 'clientProject',
      };
      if (this.clientId) data.clientId = this.clientId;
      this.afs.collection('tasks').add(data);
    }
  }
}
