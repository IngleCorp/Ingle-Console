import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {
  isCollapsed = false;
  isMobile = false;
  expandedWidth = 280;
  collapsedWidth = 70;
  
  // Search functionality
  searchQuery = '';
  showSearchResults = false;
  searchResults: any[] = [];
  
  // Notifications
  notifications: any[] = [];
  notificationCount = 0;
  unreadCount = 0;
  hasNewNotifications = false;
  
  // User profile
  userProfile: any = {};
  
  // Mobile detection
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkMobile();
  }

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.checkMobile();
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadNotifications();
  }

  private checkMobile() {
    this.isMobile = window.innerWidth < 768;
  }

  private loadUserProfile() {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.userProfile = user;
      }
    });
  }

  private loadNotifications() {
    // Mock notifications for now
    this.notifications = [
      {
        id: 1,
        message: 'Your ticket #123 has been updated',
        time: '2 hours ago',
        read: false,
        type: 'ticket',
        icon: 'confirmation_number'
      },
      {
        id: 2,
        message: 'New project milestone completed',
        time: '1 day ago',
        read: true,
        type: 'project',
        icon: 'assignment'
      }
    ];
    this.updateNotificationCounts();
  }

  private updateNotificationCounts() {
    this.notificationCount = this.notifications.length;
    this.unreadCount = this.notifications.filter(n => !n.read).length;
    this.hasNewNotifications = this.unreadCount > 0;
  }

  toggleMenu() {
    this.isCollapsed = !this.isCollapsed;
  }

  closeSidenav() {
    if (this.isMobile) {
      // Close mobile sidenav
    }
  }

  navigateToHome() {
    this.router.navigate(['/client/home']);
  }

  navigateToProfile() {
    this.router.navigate(['/client/profile']);
  }

  openSettings() {
    this.router.navigate(['/client/settings']);
  }

  handleSignOut() {
    this.authService.logout();
  }

  // Search functionality
  onSearchInput() {
    if (this.searchQuery.trim()) {
      this.performSearch();
    } else {
      this.searchResults = [];
      this.showSearchResults = false;
    }
  }

  onSearchFocus() {
    if (this.searchQuery.trim() && this.searchResults.length > 0) {
      this.showSearchResults = true;
    }
  }

  onSearchBlur() {
    setTimeout(() => {
      this.showSearchResults = false;
    }, 200);
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
  }

  private performSearch() {
    // Mock search results
    this.searchResults = [
      {
        id: 1,
        title: 'Ticket #123',
        subtitle: 'Website issue',
        type: 'ticket',
        icon: 'confirmation_number'
      },
      {
        id: 2,
        title: 'Project Alpha',
        subtitle: 'Web Development',
        type: 'project',
        icon: 'assignment'
      }
    ];
    this.showSearchResults = true;
  }

  selectSearchResult(result: any) {
    if (result.type === 'ticket') {
      this.router.navigate(['/client/tickets', result.id]);
    } else if (result.type === 'project') {
      this.router.navigate(['/client/projects', result.id]);
    }
    this.showSearchResults = false;
    this.searchQuery = '';
  }

  viewAllSearchResults() {
    // Navigate to search results page
    this.showSearchResults = false;
  }

  // Notification methods
  markAsRead(notificationId: number) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = !notification.read;
      this.updateNotificationCounts();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.updateNotificationCounts();
  }

  dismissNotification(notificationId: number) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.updateNotificationCounts();
  }

  viewAllNotifications() {
    this.router.navigate(['/client/notifications']);
  }

  trackNotification(index: number, notification: any): number {
    return notification.id;
  }

  trackSearchResult(index: number, result: any): number {
    return result.id;
  }
} 