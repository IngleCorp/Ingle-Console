import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ticket-form',
  templateUrl: './ticket-form.component.html',
  styleUrls: ['./ticket-form.component.scss']
})
export class TicketFormComponent implements OnInit, OnDestroy {
  ticketForm: FormGroup;
  isLoading: boolean = false;
  isEditMode: boolean = false;
  currentUser: any;
  private userSubscription: Subscription = new Subscription();
  
  // Ticket types and statuses
  ticketTypes = [
    { value: 'info', title: 'Info' },
    { value: 'requirement', title: 'Requirement' },
    { value: 'issue', title: 'Issue' },
    { value: 'faq', title: 'FAQ' },
    { value: 'bug', title: 'Bug' },
    { value: 'feature', title: 'Feature Request' },
    { value: 'support', title: 'Support' }
  ];

  ticketStatuses = [
    { value: 'open', title: 'Open' },
    { value: 'progress', title: 'In Progress' },
    { value: 'closed', title: 'Closed' },
    { value: 'pending', title: 'Pending' },
    { value: 'hold', title: 'On Hold' },
    { value: 'reopened', title: 'Reopened' }
  ];

  priorityLevels = [
    { value: 'low', title: 'Low' },
    { value: 'medium', title: 'Medium' },
    { value: 'high', title: 'High' },
    { value: 'urgent', title: 'Urgent' }
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
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService
  ) {
    this.ticketForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      type: ['support', Validators.required],
      status: ['open', Validators.required],
      priority: ['medium', Validators.required],
      number: ['', Validators.required],
      description: ['', Validators.required],
      category: ['general', Validators.required],
      reportedBy: ['']
    });
  }

  ngOnInit(): void {
    this.subscribeToUser();
    this.generateTicketNumber();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  subscribeToUser(): void {
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.currentUser = user;
      if (this.currentUser) {
        this.ticketForm.patchValue({
          reportedBy: this.currentUser.displayName || this.currentUser.name || ''
        });
      }
    });
  }

  generateTicketNumber(): void {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    const ticketNumber = `CT-${timestamp}-${random}`;
    
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

    this.createTicket(formData);
  }

  createTicket(formData: any): void {
    const ticketData = {
      ...formData,
      userId: this.currentUser?.uid || null,
      userName: formData.reportedBy || this.currentUser?.displayName || this.currentUser?.name || 'Anonymous',
      userEmail: this.currentUser?.email || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isClientTicket: true
    };

    this.afs.collection('tickets').add(ticketData)
      .then((docRef) => {
        console.log('Ticket created with ID:', docRef.id);
        this.isLoading = false;
        this.showNotification('Ticket created successfully! We will get back to you soon.', 'success');
        this.router.navigate(['/client/tickets']);
      })
      .catch((error) => {
        console.error('Error creating ticket:', error);
        this.isLoading = false;
        this.showNotification('Error creating ticket. Please try again.', 'error');
      });
  }

  onCancel(): void {
    this.router.navigate(['/client/tickets']);
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
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
      case 'feature':
        return 'lightbulb';
      case 'support':
        return 'support_agent';
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

  getPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'low':
        return '#28a745';
      case 'medium':
        return '#ffc107';
      case 'high':
        return '#fd7e14';
      case 'urgent':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'low':
        return 'arrow_downward';
      case 'medium':
        return 'remove';
      case 'high':
        return 'arrow_upward';
      case 'urgent':
        return 'priority_high';
      default:
        return 'remove';
    }
  }

  getSelectedTypeDisplay(): string {
    const selectedType = this.ticketForm.get('type')?.value;
    const type = this.ticketTypes.find(t => t.value === selectedType);
    return type ? type.title : '';
  }

  getSelectedPriorityDisplay(): string {
    const selectedPriority = this.ticketForm.get('priority')?.value;
    const priority = this.priorityLevels.find(p => p.value === selectedPriority);
    return priority ? priority.title : '';
  }
} 