import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subject, takeUntil } from 'rxjs';
import { AddDocumentComponent } from './add-document/add-document.component';
import { ViewDocumentComponent } from './view-document/view-document.component';
import * as FileSaver from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';

@Component({
  selector: 'app-project-library',
  templateUrl: './project-library.component.html',
  styleUrls: ['./project-library.component.scss']
})
export class ProjectLibraryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  projectId: string = '';
  documents: any[] = [];
  isLoading = false;
  searchTerm = '';
  selectedTypeFilter = '';
  
  documentTypes = [
    { value: '', label: 'All Types' },
    { value: 'document', label: 'Document' },
    { value: 'template', label: 'Template' },
    { value: 'guide', label: 'Guide' },
    { value: 'reference', label: 'Reference' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private afs: AngularFirestore
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') || '';
    this.loadDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocuments(): void {
    this.isLoading = true;
    
    this.afs.collection('projects')
      .doc(this.projectId)
      .collection('library', ref => ref.orderBy('createdAt', 'desc'))
      .valueChanges({ idField: 'id' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documents: any) => {
          this.documents = documents || [];
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading documents:', error);
          this.isLoading = false;
          this.showNotification('Error loading documents', 'error');
        }
      });
  }

  get filteredDocuments(): any[] {
    let filtered = this.documents;

    if (this.searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (this.selectedTypeFilter) {
      filtered = filtered.filter(doc => doc.type === this.selectedTypeFilter);
    }

    return filtered;
  }

  addDocument(): void {
    const dialogRef = this.dialog.open(AddDocumentComponent, {
      width: '90%',
      height: '90%',
      maxWidth: '1200px',
      disableClose: true,
      data: { 
        projectId: this.projectId, 
        type: 'add' 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDocuments();
        this.showNotification('Document added successfully', 'success');
      }
    });
  }

  editDocument(document: any): void {
    const dialogRef = this.dialog.open(AddDocumentComponent, {
      width: '90%',
      height: '90%',
      maxWidth: '1200px',
      disableClose: true,
      data: {
        projectId: this.projectId,
        type: 'edit',
        document: document
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDocuments();
        this.showNotification('Document updated successfully', 'success');
      }
    });
  }

  viewDocument(document: any): void {
    this.dialog.open(ViewDocumentComponent, {
      width: '80%',
      height: '80%',
      maxWidth: '1000px',
      data: {
        projectId: this.projectId,
        document: document
      }
    });
  }

  openDocument(document: any): void {
    this.router.navigate(['document', document.id], { relativeTo: this.route });
  }

  downloadDocument(document: any): void {
    try {
      asBlob(document.description).then((data: any) => {
        FileSaver.saveAs(data, `${document.title}.docx`);
        this.showNotification('Document downloaded successfully', 'success');
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      this.showNotification('Error downloading document', 'error');
    }
  }

  deleteDocument(document: any): void {
    if (confirm(`Are you sure you want to delete "${document.title}"?`)) {
      this.afs.collection('projects')
        .doc(this.projectId)
        .collection('library')
        .doc(document.id)
        .delete()
        .then(() => {
          this.loadDocuments();
          this.showNotification('Document deleted successfully', 'success');
        })
        .catch((error: any) => {
          console.error('Error deleting document:', error);
          this.showNotification('Error deleting document', 'error');
        });
    }
  }

  getDocumentIcon(type: string): string {
    switch (type) {
      case 'template': return 'description';
      case 'guide': return 'menu_book';
      case 'reference': return 'library_books';
      default: return 'article';
    }
  }

  getDocumentTypeColor(type: string): string {
    switch (type) {
      case 'template': return '#2196F3';
      case 'guide': return '#4CAF50';
      case 'reference': return '#FF9800';
      default: return '#9E9E9E';
    }
  }

  getRecentDocumentsCount(): number {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return this.documents.filter(doc => {
      const docDate = doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
      return docDate >= sevenDaysAgo;
    }).length;
  }

  getDocumentPreview(content: string): string {
    // Remove HTML tags and get plain text
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }
} 