import { BreakpointObserver } from '@angular/cdk/layout';
import {Component,ViewChild,OnInit, OnDestroy} from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subscription } from 'rxjs';

interface Notification {
  id: string;
  message: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'error';
  icon: string;
  read: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'project' | 'client' | 'task' | 'user';
  icon: string;
  url: string;
}

interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isOnline?: boolean;
  status: 'online' | 'away' | 'busy' | 'offline';
}

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent implements OnInit, OnDestroy {

  title = 'material-responsive-sidenav';
  @ViewChild(MatSidenav)
  sidenav!: MatSidenav;
  isMobile = true;
  isCollapsed = false; // Start expanded by default
  universityMenuOpen = false;
  showSubmenu = false;
  showSubmenuIcon = true; // Show submenu icon when expanded
  sidenavWidth = 280; // Default expanded width
  collapsedWidth = 80; // Collapsed width
  expandedWidth = 280; // Expanded width

  // Notification properties
  notifications: Notification[] = [
    {
      id: '1',
      message: 'New milestone deadline approaching',
      time: '2 hours ago',
      type: 'warning',
      icon: 'schedule',
      read: false
    },
    {
      id: '2',
      message: 'Client feedback received',
      time: '4 hours ago',
      type: 'info',
      icon: 'message',
      read: false
    },
    {
      id: '3',
      message: 'Project status update required',
      time: '1 day ago',
      type: 'error',
      icon: 'warning',
      read: true
    }
  ];

  // Search properties
  searchQuery: string = '';
  showSearchResults: boolean = false;
  searchResults: SearchResult[] = [];

  // User profile properties
  userProfile: UserProfile = {
    name: 'Admin User',
    email: 'admin@ingle.com',
    role: 'Administrator',
    isOnline: true,
    status: 'online'
  };

  // Notification computed properties
  get notificationCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get hasNewNotifications(): boolean {
    return this.notifications.some(n => !n.read);
  }

  projects: any[] = [];
  private projectsSub?: Subscription;

  constructor(private observer: BreakpointObserver, private router: Router, private auth: AngularFireAuth, private firestore: AngularFirestore) {}

  ngOnInit(): void {
    this.projectsSub = this.firestore.collection('projects').valueChanges({ idField: 'id' }).subscribe((projects: any[]) => {
      this.projects = projects;
    });
    this.observer.observe(['(max-width: 800px)']).subscribe((screenSize) => {
      if(screenSize.matches){
        this.isMobile = true;
        this.isCollapsed = false; // Keep expanded on mobile
        this.showSubmenuIcon = true;
      } else {
        this.isMobile = false;
        // On desktop, start expanded
        this.isCollapsed = false;
        this.showSubmenuIcon = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.projectsSub?.unsubscribe();
  }

  toggleMenu() {
    if(this.isMobile){
      // On mobile, toggle the sidenav open/close
      this.sidenav.toggle();
    } else {
      // On desktop, toggle between expanded and collapsed
      this.isCollapsed = !this.isCollapsed;
      
      // Update sidenav state
      if(this.isCollapsed){
        // When collapsing
        this.showSubmenuIcon = false;
        this.showSubmenu = false;
        this.sidenav.mode = 'side';
        this.sidenav.open();
      } else {
        // When expanding
        this.showSubmenuIcon = true;
        this.sidenav.mode = 'side';
        this.sidenav.open();
      }
      
      // Trigger change detection to update CSS classes
      setTimeout(() => {
        // This ensures the CSS transitions work properly
        const sidenavElement = document.querySelector('.modern-sidenav');
        if (sidenavElement) {
          sidenavElement.classList.toggle('collapsed', this.isCollapsed);
        }
      }, 0);
    }
  }

  // Method to handle submenu toggle
  toggleSubmenu() {
    if (!this.isCollapsed) {
      this.showSubmenu = !this.showSubmenu;
    }
  }

  // Method to close sidenav on mobile
  closeSidenav() {
    if (this.isMobile) {
      this.sidenav.close();
    }
  }

  // Notification methods
  trackNotification(index: number, notification: Notification): string {
    return notification.id;
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
  }

  dismissNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
  }

  viewAllNotifications(): void {
    // Navigate to notifications page or open full notifications view
    console.log('View all notifications clicked');
  }

  // Search methods
  trackSearchResult(index: number, result: SearchResult): string {
    return result.id;
  }

  onSearchInput(): void {
    if (this.searchQuery.trim().length > 0) {
      this.performSearch();
      this.showSearchResults = true;
    } else {
      this.searchResults = [];
      this.showSearchResults = false;
    }
  }

  onSearchFocus(): void {
    if (this.searchQuery.trim().length > 0 && this.searchResults.length > 0) {
      this.showSearchResults = true;
    }
  }

  onSearchBlur(): void {
    // Delay hiding results to allow for clicks
    setTimeout(() => {
      this.showSearchResults = false;
    }, 200);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
  }

  performSearch(): void {
    const query = this.searchQuery.toLowerCase();
    // Project search from Firestore
    const projectResults = this.projects
      .filter(project =>
        (project.name && project.name.toLowerCase().includes(query)) ||
        (project.description && project.description.toLowerCase().includes(query))
      )
      .map(project => ({
        id: project.id,
        title: project.name,
        subtitle: project.description || '',
        type: 'project' as const,
        icon: 'folder',
        url: project.clientid ? `/admin/clients/${project.clientid}/projects/${project.id}` : `/admin/projects/${project.id}`
      }));
    // You can keep or merge with other search results if needed
    this.searchResults = projectResults;
  }

  selectSearchResult(result: SearchResult): void {
    if (result.type === 'project') {
      // Find the project in the loaded projects array
      const project = this.projects.find(p => p.id === result.id);
      if (project && project.clientid) {
        // Navigate to the project board's default tab (tasks)
        this.router.navigate([`/admin/clients/${project.clientid}/projects/${project.id}/tasks`]);
      } else {
        // Fallback: just go to the project board
        this.router.navigate([`/admin/projects/${result.id}`]);
      }
    } else {
      this.router.navigate([result.url]);
    }
    this.clearSearch();
  }

  viewAllSearchResults(): void {
    // Navigate to search results page
    console.log('View all search results clicked');
    this.clearSearch();
  }

  // User profile methods
  navigateToProfile(): void {
    this.router.navigate(['/admin/profile']);
  }

  openSettings(): void {
    this.router.navigate(['/admin/settings']);
  }

  openHelp(): void {
    this.router.navigate(['/admin/help']);
  }

  async handleSignOut() {
    if(window.confirm("Are you sure you want to logout?")){
      try {
        const res = await this.signOut();
        this.router.navigateByUrl('/login');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  }

  signOut(){
    this.router.navigateByUrl('/login');
  }
}