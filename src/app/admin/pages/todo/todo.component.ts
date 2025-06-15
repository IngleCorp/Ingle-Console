import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TodoFormComponent } from './todo-form/todo-form.component';

interface Task {
  title: string;
  description: string;
  labels: string[];
  assignees: string[];
  status: 'todo' | 'inprogress' | 'completed' | 'hold';
}

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html',
  styleUrl: './todo.component.scss'
})
export class TodoComponent {
  tasks: Task[] = [];
  users: string[] = ['Alice', 'Bob', 'Charlie', 'David'];
  labels: string[] = ['Urgent', 'Feature', 'Bug', 'Improvement'];
  statuses: Task['status'][] = ['todo', 'inprogress', 'completed', 'hold'];

  constructor(private dialog: MatDialog) {}

  getTasksByStatus(status: Task['status']) {
    return this.tasks.filter(task => task.status === status);
  }

  openForm(task: Task | null = null, index: number | null = null) {
    const dialogRef = this.dialog.open(TodoFormComponent, {
      width: '400px',
      data: {
        task,
        users: this.users,
        labels: this.labels
      }
    });
    dialogRef.afterClosed().subscribe((result: Task | undefined) => {
      if (result) {
        if (task && index !== null) {
          this.tasks[index] = result;
        } else {
          this.tasks.push(result);
        }
      }
    });
  }

  moveTask(index: number, newStatus: Task['status']) {
    this.tasks[index].status = newStatus;
  }

  editTask(task: Task, index: number) {
    this.openForm(task, index);
  }
}
