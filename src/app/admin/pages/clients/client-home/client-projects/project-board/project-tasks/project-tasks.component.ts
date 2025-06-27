import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
// import { ToastrService } from 'ngx-toastr'; // Uncomment if available
// import { AssignComponent } from '...'; // Uncomment if available
// import { TimetakenComponent } from './timetaken/timetaken.component'; // Uncomment if available

@Component({
  selector: 'app-project-tasks',
  templateUrl: './project-tasks.component.html',
  styleUrls: ['./project-tasks.component.scss']
})
export class ProjectTasksComponent implements OnInit {
  taskdata: any;
  task: string = '';
  projectId: string | null = null;
  projectname: string = '';
  tasktodo: any;
  taskdone: any;
  taskonhold: any;
  buffervalue: number = 75;
  constructor(
    private dialog: MatDialog,
    private afs: AngularFirestore,
    // private service: GeneralService, // Uncomment if needed
    private route: ActivatedRoute,
    // private toastr: ToastrService // Uncomment if available
  ) { }

  ngOnInit(): void {
    localStorage.setItem('pactivetab', 'tasks');
    this.projectId = this.route.parent?.snapshot.paramMap.get('pid') ?? null;
    this.getTasks();
    if (this.projectId) {
      this.afs.collection('projects').doc(this.projectId).valueChanges().subscribe((res: any) => {
        this.projectname = res?.name;
      });
    }
  }

  getTasks(): void {
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
    // const dia = this.dialog.open(TimetakenComponent, {
    //   width: '500px',
    //   disableClose: true,
    //   data: { task: task }
    // });
    // dia.afterClosed().subscribe(res => {
    //   if (res.sts) {
    //     this.afs.doc('tasks/' + task.id).update({
    //       status: 'done',
    //       timeTaken: res.time
    //     });
    //     if(res?.worksheet){
    //       let worksheet = res?.worksheet;
    //       this.afs.collection('projects').doc(this.projectId).collection(worksheet).add({
    //         task: task.task,
    //         status: "Completed",
    //         doneby: localStorage.getItem('username'),
    //         remarks: 'none',
    //         time: res.time,
    //         createdAt: new Date(),
    //         taskId: task.id,
    //       });
    //     }
    //   }
    // });
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
      this.afs.collection('tasks').add({
        task: this.task,
        createdAt: new Date(),
        status: 'todo',
        createdby: localStorage.getItem('username'),
        createdbyid: localStorage.getItem('userid'),
        projecttaged: this.projectId,
        projectname: this.projectname,
        assigns: []
      }).then(() => {
        this.task = '';
        // this.toastr.success('Task added', 'Action'); // Uncomment if available
      });
    } else {
      // this.toastr.warning('Please enter task'); // Uncomment if available
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
}
