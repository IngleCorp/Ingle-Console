import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-file-viewer',
  templateUrl: './file-viewer.component.html',
  styleUrls: ['./file-viewer.component.scss']
})
export class FileViewerComponent implements OnInit {
  fileId: string | null = null;
  projectId: string | null = null;
  file: any = null;
  isLoading: boolean = false;
  error: string | null = null;
  imageZoom: number = 1;
  pdfLoading: boolean = false;
  encodeURIComponent = encodeURIComponent; // Make global function accessible in template

  // Supported file types for preview
  supportedPreviewTypes = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
    pdf: ['pdf'],
    document: ['doc', 'docx', 'txt', 'rtf'],
    spreadsheet: ['xls', 'xlsx', 'csv'],
    presentation: ['ppt', 'pptx']
  };

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.fileId = this.route.snapshot.paramMap.get('fileId');
    console.log('File ID:', this.fileId);
    //this.projectId = this.route.parent?.parent?.snapshot.paramMap.get('projectId') ?? null;
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    console.log('Project ID:', this.projectId);
    

    if (!this.fileId || !this.projectId) {
      this.error = 'File or project not found';
      return;
    }

    this.getFile();
  }

  getFile(): void {
    this.isLoading = true;
    this.error = null;

    if (!this.projectId || !this.fileId) {
      this.error = 'Project or file ID not found';
      this.isLoading = false;
      return;
    }

    this.afs.collection('projects').doc(this.projectId).collection('files')
      .doc(this.fileId)
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          if (data) {
            this.file = { ...data, id: this.fileId };
            console.log('File data loaded:', this.file);
            console.log('File URL:', this.file.url);
            console.log('File type:', this.getFileType());
            
            // Set PDF loading state if it's a PDF
            if (this.getFileType() === 'pdf') {
              this.pdfLoading = true;
            }
            
            this.isLoading = false;
          } else {
            this.error = 'File not found';
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Error fetching file:', error);
          this.error = 'Error loading file';
          this.isLoading = false;
        }
      });
  }

  canPreviewFile(): boolean {
    if (!this.file?.format) return false;
    
    const format = this.file.format.toLowerCase();
    return Object.values(this.supportedPreviewTypes).flat().includes(format);
  }

  getFileType(): string {
    if (!this.file?.format) return 'unknown';
    
    const format = this.file.format.toLowerCase();
    
    if (this.supportedPreviewTypes.image.includes(format)) return 'image';
    if (this.supportedPreviewTypes.pdf.includes(format)) return 'pdf';
    if (this.supportedPreviewTypes.document.includes(format)) return 'document';
    if (this.supportedPreviewTypes.spreadsheet.includes(format)) return 'spreadsheet';
    if (this.supportedPreviewTypes.presentation.includes(format)) return 'presentation';
    
    return 'unknown';
  }

  getFileIcon(): string {
    const type = this.getFileType();
    
    switch (type) {
      case 'image': return 'image';
      case 'pdf': return 'picture_as_pdf';
      case 'document': return 'description';
      case 'spreadsheet': return 'table_chart';
      case 'presentation': return 'slideshow';
      default: return 'insert_drive_file';
    }
  }

  getFileTypeColor(): string {
    const type = this.getFileType();
    
    switch (type) {
      case 'image': return '#4caf50';
      case 'pdf': return '#f44336';
      case 'document': return '#2196f3';
      case 'spreadsheet': return '#4caf50';
      case 'presentation': return '#ff9800';
      default: return '#757575';
    }
  }

  downloadFile(): void {
    if (!this.file?.url) {
      this.showNotification('Download URL not available', 'error');
      return;
    }

    try {
      // For Firebase Storage URLs, we need to handle them properly
      if (this.file.url.includes('firebase')) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = this.file.url;
        link.download = this.file.name;
        link.target = '_blank';
        
        // Add authorization headers if needed
        link.setAttribute('download', this.file.name);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Download started', 'success');
      } else {
        // For other URLs, use the standard approach
        const link = document.createElement('a');
        link.href = this.file.url;
        link.download = this.file.name;
        link.click();
        
        this.showNotification('Download started', 'success');
      }
    } catch (error) {
      console.error('Download error:', error);
      this.showNotification('Download failed. Please try opening the file in a new tab.', 'error');
    }
  }

  goBack(): void {
    this.router.navigate(['../../'], { relativeTo: this.route });
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
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
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

  onImageError(event: any): void {
    console.error('Image failed to load:', event);
    console.error('File URL:', this.file?.url);
    console.error('File data:', this.file);
    this.error = 'Failed to load image. The file may be corrupted or the URL is invalid.';
  }

  onImageLoad(event: any): void {
    console.log('Image loaded successfully:', event);
    console.log('Image URL:', this.file?.url);
    this.error = null; // Clear any previous errors
  }

  zoomIn(): void {
    this.imageZoom = Math.min(this.imageZoom + 0.25, 3);
  }

  zoomOut(): void {
    this.imageZoom = Math.max(this.imageZoom - 0.25, 0.25);
  }

  resetZoom(): void {
    this.imageZoom = 1;
  }

  getPdfViewerUrl(): string {
    if (!this.file?.url) return '';
    // Use Google Docs viewer for PDF files
    return `https://docs.google.com/viewer?url=${encodeURIComponent(this.file.url)}&embedded=true`;
  }

  onPdfLoad(event: any): void {
    console.log('PDF loaded successfully:', event);
    this.pdfLoading = false;
    this.error = null;
  }

  onPdfError(event: any): void {
    console.error('PDF failed to load:', event);
    this.pdfLoading = false;
    this.error = 'Failed to load PDF. Please try downloading the file or opening it in a new tab.';
  }

  openPdfInNewTab(): void {
    if (!this.file?.url) {
      this.showNotification('PDF URL not available', 'error');
      return;
    }
    window.open(this.file.url, '_blank');
  }

  openPdfInBrowser(): void {
    if (!this.file?.url) {
      this.showNotification('PDF URL not available', 'error');
      return;
    }
    // Open PDF directly in browser (works better for some browsers)
    window.open(this.file.url, '_blank', 'noopener,noreferrer');
  }
} 