import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuillEditorComponent } from 'ngx-quill';

@Component({
  selector: 'app-project-ticket-form',
  templateUrl: './project-ticket-form.component.html',
  styleUrls: ['./project-ticket-form.component.scss']
})
export class ProjectTicketFormComponent implements OnInit, OnDestroy {
  ticketForm: FormGroup;
  isLoading: boolean = false;
  isEditMode: boolean = false;
  
  // Ticket types and statuses
  ticketTypes = [
    { value: 'info', title: 'Info' },
    { value: 'requirement', title: 'Requirement' },
    { value: 'issue', title: 'Issue' },
    { value: 'faq', title: 'FAQ' },
    { value: 'bug', title: 'Bug' }
  ];

  ticketStatuses = [
    { value: 'open', title: 'Open' },
    { value: 'progress', title: 'Progress' },
    { value: 'closed', title: 'Closed' },
    { value: 'pending', title: 'Pending' },
    { value: 'hold', title: 'Hold' },
    { value: 'reopened', title: 'Reopened' }
  ];

  // Quill editor configuration
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image', 'video']
    ]
  };

  quillStyles = {
    height: '200px'
  };

  constructor(
    private fb: FormBuilder,
    private afs: AngularFirestore,
    private dialogRef: MatDialogRef<ProjectTicketFormComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.ticketForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      type: ['info', Validators.required],
      status: ['open', Validators.required],
      number: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.isEditMode = this.data?.type === 'edit';
    
    if (this.isEditMode && this.data?.ticket) {
      this.populateForm(this.data.ticket);
    } else {
      // Generate ticket number for new tickets
      this.generateTicketNumber();
      
      // Set default type if provided
      if (this.data?.ticketType) {
        this.ticketForm.patchValue({
          type: this.data.ticketType
        });
      }
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  populateForm(ticket: any): void {
    this.ticketForm.patchValue({
      title: ticket.title || '',
      type: ticket.type || 'info',
      status: ticket.status || 'open',
      number: ticket.number || '',
      description: ticket.description || ''
    });
  }

  generateTicketNumber(): void {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    const ticketNumber = `PT-${timestamp}-${random}`;
    
    this.ticketForm.patchValue({
      number: ticketNumber
    });
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) {
      this.showNotification('Please fill all required fields correctly', 'error');
      return;
    }

    this.isLoading = true;
    const formData = this.ticketForm.value;

    if (this.isEditMode) {
      this.updateTicket(formData);
    } else {
      this.createTicket(formData);
    }
  }

  createTicket(formData: any): void {
    if (!this.data?.projectId) {
      this.showNotification('Project ID not found', 'error');
      this.isLoading = false;
      return;
    }

    const ticketData = {
      ...formData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.afs.collection('projects').doc(this.data.projectId).collection('tickets').add(ticketData)
      .then((docRef) => {
        console.log('Ticket created with ID:', docRef.id);
        this.isLoading = false;
        this.dialogRef.close({ success: true, ticketId: docRef.id });
        this.showNotification('Ticket created successfully', 'success');
      })
      .catch((error) => {
        console.error('Error creating ticket:', error);
        this.isLoading = false;
        this.showNotification('Error creating ticket', 'error');
      });
  }

  updateTicket(formData: any): void {
    if (!this.data?.projectId || !this.data?.ticket?.id) {
      this.showNotification('Project ID or Ticket ID not found', 'error');
      this.isLoading = false;
      return;
    }

    const ticketData = {
      ...formData,
      updatedAt: new Date()
    };

    this.afs.collection('projects').doc(this.data.projectId).collection('tickets').doc(this.data.ticket.id).update(ticketData)
      .then(() => {
        console.log('Ticket updated successfully');
        this.isLoading = false;
        this.dialogRef.close({ success: true, ticketId: this.data.ticket.id });
        this.showNotification('Ticket updated successfully', 'success');
      })
      .catch((error) => {
        console.error('Error updating ticket:', error);
        this.isLoading = false;
        this.showNotification('Error updating ticket', 'error');
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
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
} 