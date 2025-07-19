import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
  clientId?: string;
  department: string;
  phone: string;
  avatar?: string;
  isActive: boolean;
}

interface Client {
  id?: string;
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  industry?: string;
  description?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  // User and client data
  currentUser: User | null = null;
  clientData: Client | null = null;
  isLoading = true;
  error: string | null = null;

  // Dashboard stats
  stats = {
    activeTickets: 0,
    totalProjects: 0,
    pendingDocuments: 0,
    unreadMessages: 0
  };

  // Recent activities
  recentActivities = [
    {
      id: 1,
      type: 'ticket',
      title: 'Ticket #123 Updated',
      description: 'Your support ticket has been updated by the team',
      time: '2 hours ago',
      icon: 'confirmation_number'
    },
    {
      id: 2,
      type: 'project',
      title: 'Project Milestone Completed',
      description: 'Phase 1 of your website project has been completed',
      time: '1 day ago',
      icon: 'assignment'
    },
    {
      id: 3,
      type: 'document',
      title: 'New Document Available',
      description: 'Project proposal document has been uploaded',
      time: '2 days ago',
      icon: 'description'
    }
  ];

  // Quick actions
  quickActions = [
    {
      title: 'Create Ticket',
      description: 'Submit a new support request',
      icon: 'add_circle',
      route: '/client/tickets/new',
      color: '#ff6b6b'
    },
    {
      title: 'View Projects',
      description: 'Check your project status',
      icon: 'assignment',
      route: '/client/projects',
      color: '#4ecdc4'
    },
    {
      title: 'Documents',
      description: 'Access your documents',
      icon: 'folder',
      route: '/client/documents',
      color: '#45b7d1'
    },
    {
      title: 'Messages',
      description: 'Check your messages',
      icon: 'message',
      route: '/client/messages',
      color: '#96ceb4'
    }
  ];

  constructor(private firestore: AngularFirestore) { }

  ngOnInit(): void {
    this.loadUserAndClientData();
  }

  async loadUserAndClientData(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;

      // Get user data from localStorage
      const encodedUser = localStorage.getItem('ingle_user');
      if (!encodedUser) {
        this.error = 'User data not found. Please log in again.';
        return;
      }

      // Decode user data
      this.currentUser = JSON.parse(atob(encodedUser)) as User;
      
      if (!this.currentUser?.clientId) {
        this.error = 'No client assigned to this user. Please contact your administrator.';
        return;
      }

      // Load client data from Firestore
      const clientDoc = await this.firestore.doc(`clients/${this.currentUser.clientId}`).get().toPromise();
      
      if (clientDoc?.exists) {
        this.clientData = {
          id: clientDoc.id,
          ...(clientDoc.data() as any)
        } as Client;
        
        // Load dashboard stats based on client data
        await this.loadDashboardStats();
      } else {
        this.error = 'Client data not found. Please contact your administrator.';
      }

    } catch (error) {
      console.error('Error loading user and client data:', error);
      this.error = 'Error loading data. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async loadDashboardStats(): Promise<void> {
    if (!this.currentUser?.clientId) return;

    try {
      // Load tickets count
      const ticketsSnapshot = await this.firestore
        .collection('tickets', ref => ref.where('clientId', '==', this.currentUser?.clientId))
        .get().toPromise();
      this.stats.activeTickets = ticketsSnapshot?.size || 0;

      // Load projects count
      const projectsSnapshot = await this.firestore
        .collection('projects', ref => ref.where('clientId', '==', this.currentUser?.clientId))
        .get().toPromise();
      this.stats.totalProjects = projectsSnapshot?.size || 0;

      // Load documents count
      const documentsSnapshot = await this.firestore
        .collection('documents', ref => ref.where('clientId', '==', this.currentUser?.clientId))
        .get().toPromise();
      this.stats.pendingDocuments = documentsSnapshot?.size || 0;

      // Load messages count (you might need to adjust this based on your messages structure)
      const messagesSnapshot = await this.firestore
        .collection('messages', ref => ref.where('clientId', '==', this.currentUser?.clientId))
        .get().toPromise();
      this.stats.unreadMessages = messagesSnapshot?.size || 0;

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }

} 