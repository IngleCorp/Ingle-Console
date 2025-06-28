import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-project-files',
  templateUrl: './project-files.component.html',
  styleUrls: ['./project-files.component.scss']
})
export class ProjectFilesComponent implements OnInit {
  projectId: string | null = null;
  projectFiles: any[] = [];
  filteredFiles: any[] = [];
  selectedFileType: string = '';
  searchTerm: string = '';
  isLoading: boolean = false;
  dragOver: boolean = false;

  // File type categories
  fileTypes = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
    document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
    spreadsheet: ['xls', 'xlsx', 'csv', 'ods'],
    presentation: ['ppt', 'pptx', 'odp'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz'],
    code: ['js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'php'],
    video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg']
  };

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    localStorage.setItem('pactivetab', 'files');
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    console.log('Project ID:', this.projectId);
    this.getProjectFiles();
  }

  getProjectFiles(): void {
    if (!this.projectId) return;
    
    this.isLoading = true;
    this.afs.collection('projects').doc(this.projectId).collection('files')
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          console.log('Project files:', data);
          this.projectFiles = data || [];
          this.filteredFiles = [...this.projectFiles];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching files:', error);
          this.isLoading = false;
          this.showNotification('Error loading files', 'error');
        }
      });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadFile(files[0]);
    }
  }

  uploadFile(file: File): void {
    if (!this.projectId) {
      this.showNotification('Project ID not found', 'error');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.showNotification('File size must be less than 10MB', 'error');
      return;
    }

    this.isLoading = true;
    
    // For now, we'll simulate file upload
    // In a real implementation, you'd use Firebase Storage
    setTimeout(() => {
      const fileData = {
        name: file.name,
        format: this.getFileExtension(file.name),
        size: this.formatFileSize(file.size),
        url: URL.createObjectURL(file), // Temporary URL for demo
        fileref: null, // Would be Firebase Storage reference
        createdAt: new Date(),
        createdby: localStorage.getItem('userid') || 'unknown',
        createdbyname: localStorage.getItem('username') || 'Unknown User'
      };

      this.addFileToDatabase(fileData);
    }, 1000);
  }

  addFileToDatabase(fileData: any): void {
    if (!this.projectId) return;

    this.afs.collection('projects').doc(this.projectId).collection('files')
      .add(fileData)
      .then(() => {
        this.showNotification('File uploaded successfully', 'success');
        this.getProjectFiles();
      })
      .catch((error) => {
        console.error('Error adding file:', error);
        this.showNotification('Error uploading file', 'error');
        this.isLoading = false;
      });
  }

  deleteFile(fileId: string, fileName: string): void {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      if (!this.projectId) return;

      this.afs.collection('projects').doc(this.projectId).collection('files')
        .doc(fileId)
        .delete()
        .then(() => {
          this.showNotification('File deleted successfully', 'success');
          this.getProjectFiles();
        })
        .catch((error) => {
          console.error('Error deleting file:', error);
          this.showNotification('Error deleting file', 'error');
        });
    }
  }

  viewFile(fileId: string): void {
    this.router.navigate(['file-viewer', fileId], { relativeTo: this.route });
  }

  downloadFile(file: any): void {
    // In a real implementation, you'd download from Firebase Storage
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
  }

  filterByType(): void {
    if (!this.selectedFileType) {
      this.filteredFiles = [...this.projectFiles];
    } else {
      this.filteredFiles = this.projectFiles.filter(file => 
        this.getFileCategory(file.format) === this.selectedFileType
      );
    }
  }

  searchFiles(): void {
    if (!this.searchTerm.trim()) {
      this.filteredFiles = [...this.projectFiles];
    } else {
      this.filteredFiles = this.projectFiles.filter(file =>
        file.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredFiles = [...this.projectFiles];
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  getFileCategory(extension: string): string {
    const ext = extension.toLowerCase();
    
    if (this.fileTypes.image.includes(ext)) return 'image';
    if (this.fileTypes.document.includes(ext)) return 'document';
    if (this.fileTypes.spreadsheet.includes(ext)) return 'spreadsheet';
    if (this.fileTypes.presentation.includes(ext)) return 'presentation';
    if (this.fileTypes.archive.includes(ext)) return 'archive';
    if (this.fileTypes.code.includes(ext)) return 'code';
    if (this.fileTypes.video.includes(ext)) return 'video';
    if (this.fileTypes.audio.includes(ext)) return 'audio';
    
    return 'other';
  }

  getFileIcon(format: string): string {
    const category = this.getFileCategory(format);
    
    switch (category) {
      case 'image': return 'image';
      case 'document': return 'description';
      case 'spreadsheet': return 'table_chart';
      case 'presentation': return 'slideshow';
      case 'archive': return 'folder_zip';
      case 'code': return 'code';
      case 'video': return 'video_file';
      case 'audio': return 'audiotrack';
      default: return 'insert_drive_file';
    }
  }

  getFileTypeColor(format: string): string {
    const category = this.getFileCategory(format);
    
    switch (category) {
      case 'image': return '#4caf50';
      case 'document': return '#2196f3';
      case 'spreadsheet': return '#4caf50';
      case 'presentation': return '#ff9800';
      case 'archive': return '#9c27b0';
      case 'code': return '#607d8b';
      case 'video': return '#f44336';
      case 'audio': return '#e91e63';
      default: return '#757575';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getCreatedDateTooltip(createdAt: any): string {
    if (!createdAt?.seconds) {
      return 'Date not available';
    }
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleString();
  }

  getCreatedDateDisplay(createdAt: any): string {
    if (!createdAt?.seconds) {
      return 'N/A';
    }
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

  trackByFile(index: number, file: any): string {
    return file.id || index;
  }

  triggerFileInput(): void {
    document.getElementById('file-upload')?.click();
  }
} 