import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-project-ticket-view',
  templateUrl: './project-ticket-view.component.html',
  styleUrls: ['./project-ticket-view.component.scss']
})
export class ProjectTicketViewComponent implements OnInit {
  ticket: any = null;
  projectInfo: any = null;

  constructor(
    private dialogRef: MatDialogRef<ProjectTicketViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.ticket = this.data?.ticket;
    this.projectInfo = this.data?.projectInfo;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  getTypeIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'info':
        return 'info';
      case 'issue':
        return 'report_problem';
      case 'bug':
        return 'bug_report';
      case 'faq':
        return 'help';
      case 'requirement':
        return 'assignment';
      default:
        return 'article';
    }
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'open':
        return '#28a745';
      case 'progress':
        return '#007bff';
      case 'closed':
        return '#dc3545';
      case 'pending':
        return '#ffc107';
      case 'hold':
        return '#fd7e14';
      case 'reopened':
        return '#6f42c1';
      default:
        return '#6c757d';
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp?.seconds) {
      return 'N/A';
    }
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
} 