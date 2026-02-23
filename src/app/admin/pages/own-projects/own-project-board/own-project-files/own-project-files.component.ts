import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';

const OWN_PROJECTS_COLLECTION = 'ownProjects';
const STORAGE_PREFIX = 'ownProjects';

@Component({
  selector: 'app-own-project-files',
  templateUrl: './own-project-files.component.html',
  styleUrls: ['./own-project-files.component.scss']
})
export class OwnProjectFilesComponent implements OnInit, OnDestroy {
  projectId: string | null = null;
  projectFiles: any[] = [];
  filteredFiles: any[] = [];
  selectedFileType = '';
  searchTerm = '';
  isLoading = false;
  dragOver = false;
  private filesSub?: Subscription;

  fileTypes: Record<string, string[]> = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
    document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
    spreadsheet: ['xls', 'xlsx', 'csv', 'ods'],
    presentation: ['ppt', 'pptx', 'odp'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz'],
    code: ['js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'php'],
    video: ['mp4', 'avi', 'mov', 'webm'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg']
  };

  constructor(
    private afs: AngularFirestore,
    private storage: AngularFireStorage,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.parent?.paramMap?.subscribe(params => {
      this.projectId = params.get('projectId') ?? null;
      this.filesSub?.unsubscribe();
      if (this.projectId) this.getFiles();
      else {
        this.projectFiles = [];
        this.filteredFiles = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.filesSub?.unsubscribe();
  }

  getFiles(): void {
    if (!this.projectId) return;
    this.isLoading = true;
    this.filesSub = this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('files')
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          this.projectFiles = data || [];
          this.filteredFiles = [...this.projectFiles];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error loading files', 'Close', { duration: 3000 });
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.uploadFile(file);
    input.value = '';
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
    const file = event.dataTransfer?.files?.[0];
    if (file) this.uploadFile(file);
  }

  uploadFile(file: File): void {
    if (!this.projectId) {
      this.snackBar.open('Project not found', 'Close', { duration: 3000 });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('File must be under 10MB', 'Close', { duration: 3000 });
      return;
    }
    this.isLoading = true;
    const filePath = `${STORAGE_PREFIX}/${this.projectId}/files/${Date.now()}_${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, file);

    uploadTask.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe(url => {
          const fileData = {
            name: file.name,
            format: this.getFileExtension(file.name),
            size: this.formatFileSize(file.size),
            url,
            fileref: filePath,
            createdAt: new Date(),
            createdby: localStorage.getItem('userid') || '',
            createdbyname: localStorage.getItem('username') || 'Unknown'
          };
          this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).collection('files').add(fileData)
            .then(() => {
              this.snackBar.open('File uploaded', 'Close', { duration: 3000 });
              this.getFiles();
            })
            .catch(() => {
              this.snackBar.open('Upload failed', 'Close', { duration: 3000 });
              this.isLoading = false;
            });
        });
      })
    ).subscribe();
  }

  deleteFile(fileId: string, fileName: string): void {
    if (!confirm(`Delete "${fileName}"?`)) return;
    if (!this.projectId) return;
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('files').doc(fileId)
      .get()
      .subscribe(doc => {
        if (!doc.exists) return;
        const fileref = (doc.data() as any)?.fileref;
        this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).collection('files').doc(fileId).delete()
          .then(() => {
            if (fileref) {
              this.storage.ref(fileref).delete().subscribe({ next: () => {}, error: () => {} });
            }
            this.snackBar.open('File deleted', 'Close', { duration: 3000 });
            this.getFiles();
          })
          .catch(() => this.snackBar.open('Delete failed', 'Close', { duration: 3000 }));
      });
  }

  downloadFile(file: any): void {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
  }

  filterByType(): void {
    if (!this.selectedFileType) {
      this.filteredFiles = [...this.projectFiles];
    } else {
      this.filteredFiles = this.projectFiles.filter(f =>
        this.getFileCategory(f.format) === this.selectedFileType
      );
    }
  }

  searchFiles(): void {
    if (!this.searchTerm.trim()) {
      this.filteredFiles = [...this.projectFiles];
    } else {
      const q = this.searchTerm.toLowerCase();
      this.filteredFiles = this.projectFiles.filter(f =>
        f.name?.toLowerCase().includes(q)
      );
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredFiles = [...this.projectFiles];
  }

  triggerFileInput(): void {
    document.getElementById('own-file-upload')?.click();
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  getFileCategory(ext: string): string {
    const e = ext?.toLowerCase() || '';
    for (const [cat, exts] of Object.entries(this.fileTypes)) {
      if (exts.includes(e)) return cat;
    }
    return 'other';
  }

  getFileIcon(format: string): string {
    const cat = this.getFileCategory(format);
    const map: Record<string, string> = {
      image: 'image',
      document: 'description',
      spreadsheet: 'table_chart',
      presentation: 'slideshow',
      archive: 'folder_zip',
      code: 'code',
      video: 'video_file',
      audio: 'audiotrack'
    };
    return map[cat] || 'insert_drive_file';
  }

  getFileTypeColor(format: string): string {
    const cat = this.getFileCategory(format);
    const map: Record<string, string> = {
      image: '#4caf50',
      document: '#2196f3',
      spreadsheet: '#4caf50',
      presentation: '#ff9800',
      archive: '#9c27b0',
      code: '#607d8b',
      video: '#f44336',
      audio: '#e91e63'
    };
    return map[cat] || '#757575';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getCreatedDisplay(createdAt: any): string {
    if (!createdAt?.seconds) return 'N/A';
    return new Date(createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  trackByFile(_: number, file: any): string {
    return file.id;
  }
}
