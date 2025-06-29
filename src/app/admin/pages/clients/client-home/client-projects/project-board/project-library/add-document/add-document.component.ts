import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import 'quill-table';

@Component({
  selector: 'app-add-document',
  templateUrl: './add-document.component.html',
  styleUrls: ['./add-document.component.scss']
})
export class AddDocumentComponent implements OnInit, OnDestroy {
  documentForm: FormGroup;
  isEditMode = false;
  isSaving = false;
  uploadedFiles: File[] = [];
  private quillEditor: any;

  // Quill Editor Configuration
  editorModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }, { 'header': 3 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image', 'video'],
      ['table']
    ],
    table: {
      operationMenu: {
        items: {
          unmergeCells: {
            text: 'Another unmerge cells name'
          }
        }
      }
    }
  };

  editorStyles = {
    height: '300px',
    backgroundColor: '#ffffff'
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddDocumentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private afs: AngularFirestore,
    private snackBar: MatSnackBar
  ) {
    this.documentForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      type: ['document', Validators.required],
      tags: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.type === 'edit' && this.data.document) {
      this.isEditMode = true;
      
      // Handle tags properly - convert array to string for form input
      let tagsValue = '';
      if (this.data.document.tags && Array.isArray(this.data.document.tags)) {
        tagsValue = this.data.document.tags.join(', ');
      } else if (typeof this.data.document.tags === 'string') {
        tagsValue = this.data.document.tags;
      }
      
      this.documentForm.patchValue({
        title: this.data.document.title,
        description: this.data.document.description,
        type: this.data.document.type || 'document',
        tags: tagsValue
      });
    }
  }

  ngOnDestroy(): void {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  addFiles(files: File[]): void {
    files.forEach(file => {
      if (!this.uploadedFiles.find(f => f.name === file.name)) {
        this.uploadedFiles.push(file);
      }
    });
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  previewDocument(): void {
    if (this.documentForm.valid) {
      const content = this.documentForm.value;
      // Open preview in new window or dialog
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head>
              <title>${content.title} - Preview</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
                .meta { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .content { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              </style>
            </head>
            <body>
              <h1>${content.title}</h1>
              <div class="meta">
                <strong>Type:</strong> ${content.type} | 
                <strong>Tags:</strong> ${content.tags || 'None'}
              </div>
              <div class="content">${content.description}</div>
            </body>
          </html>
        `);
        previewWindow.document.close();
      }
    }
  }

  saveDocument(): void {
    if (this.documentForm.invalid) return;
    
    this.isSaving = true;
    const value = this.documentForm.value;
    
    // Process tags - handle both string and array values
    let tags: string[] = [];
    if (value.tags) {
      if (typeof value.tags === 'string') {
        tags = value.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
      } else if (Array.isArray(value.tags)) {
        tags = value.tags.filter((tag: any) => tag && typeof tag === 'string');
      }
    }
    
    const documentData: any = {
      title: value.title,
      description: value.description,
      type: value.type,
      tags: tags,
      updatedAt: new Date()
    };

    if (this.isEditMode) {
      this.afs.collection('projects')
        .doc(this.data.projectId)
        .collection('library')
        .doc(this.data.document.id)
        .update(documentData)
        .then(() => {
          this.isSaving = false;
          this.dialogRef.close(true);
          this.showNotification('Document updated successfully', 'success');
        })
        .catch((error: any) => {
          this.isSaving = false;
          console.error('Error updating document:', error);
          this.showNotification('Error updating document', 'error');
        });
    } else {
      documentData.createdAt = new Date();
      
      this.afs.collection('projects')
        .doc(this.data.projectId)
        .collection('library')
        .add(documentData)
        .then(() => {
          this.isSaving = false;
          this.dialogRef.close(true);
          this.showNotification('Document created successfully', 'success');
        })
        .catch((error: any) => {
          this.isSaving = false;
          console.error('Error creating document:', error);
          this.showNotification('Error creating document', 'error');
        });
    }
  }

  closeDialog(): void {
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

  // Add method to handle table insertion
  onEditorCreated(editor: any): void {
    console.log('Quill editor created:', editor);
    
    // Store editor reference for custom table operations
    this.quillEditor = editor;
    
    // Add custom table insertion functionality
    this.addCustomTableFunctionality(editor);
  }

  // Custom table functionality
  private addCustomTableFunctionality(editor: any): void {
    // Override the default table insertion to create better tables
    const tableModule = editor.getModule('table');
    
    if (tableModule) {
      // Custom table insertion with better defaults
      const originalInsertTable = tableModule.insertTable;
      
      tableModule.insertTable = (rows: number = 3, cols: number = 3) => {
        const table = originalInsertTable.call(tableModule, rows, cols);
        
        // Add custom styling to the table
        setTimeout(() => {
          this.styleTable(table);
        }, 100);
        
        return table;
      };
    }
  }

  // Method to create a custom table with better styling
  createCustomTable(rows: number = 3, cols: number = 3): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      const table = tableModule.insertTable(rows, cols);
      this.styleTable(table);
    }
  }

  // Style the table with modern design
  private styleTable(table: any): void {
    if (!table) return;

    // Add custom classes and styling
    table.classList.add('custom-table', 'modern-table');
    
    // Style header row
    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
      headerRow.classList.add('table-header-row');
      const headerCells = headerRow.querySelectorAll('th');
      headerCells.forEach((cell: any) => {
        cell.classList.add('table-header-cell');
        cell.style.backgroundColor = '#667eea';
        cell.style.color = 'white';
        cell.style.fontWeight = '600';
        cell.style.textTransform = 'uppercase';
        cell.style.letterSpacing = '0.5px';
        cell.style.padding = '12px 16px';
        cell.style.border = '1px solid #e2e8f0';
      });
    }

    // Style body rows
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach((row: any, index: number) => {
      row.classList.add('table-body-row');
      if (index % 2 === 0) {
        row.classList.add('even-row');
      }
      
      const cells = row.querySelectorAll('td');
      cells.forEach((cell: any) => {
        cell.classList.add('table-body-cell');
        cell.style.padding = '12px 16px';
        cell.style.border = '1px solid #e2e8f0';
        cell.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      });
    });

    // Add table container styling
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.borderRadius = '8px';
    table.style.overflow = 'hidden';
    table.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    table.style.margin = '16px 0';
  }

  // Method to add a new row to existing table
  addTableRow(): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      tableModule.insertRow();
    }
  }

  // Method to add a new column to existing table
  addTableColumn(): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      tableModule.insertColumn();
    }
  }

  // Method to delete a row from table
  deleteTableRow(): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      tableModule.deleteRow();
    }
  }

  // Method to delete a column from table
  deleteTableColumn(): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      tableModule.deleteColumn();
    }
  }

  // Method to merge table cells
  mergeTableCells(): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      tableModule.mergeCells();
    }
  }

  // Method to split merged cells
  splitTableCells(): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      tableModule.splitCell();
    }
  }

  // Method to create a sample table with headers
  createSampleTable(): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      // Create a 4x4 table
      const table = tableModule.insertTable(4, 4);
      
      // Wait for table to be inserted then style it
      setTimeout(() => {
        this.styleTable(table);
        this.populateSampleTable(table);
      }, 100);
    }
  }

  // Populate table with sample data
  private populateSampleTable(table: any): void {
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    
    // Set header row
    if (rows[0]) {
      const headerCells = rows[0].querySelectorAll('th');
      if (headerCells.length >= 4) {
        headerCells[0].textContent = 'Task';
        headerCells[1].textContent = 'Assignee';
        headerCells[2].textContent = 'Status';
        headerCells[3].textContent = 'Due Date';
      }
    }

    // Set sample data rows
    const sampleData = [
      ['Design Homepage', 'John Doe', 'In Progress', '2024-01-15'],
      ['Setup Database', 'Jane Smith', 'Completed', '2024-01-10'],
      ['API Integration', 'Mike Johnson', 'Pending', '2024-01-20'],
      ['Testing', 'Sarah Wilson', 'Not Started', '2024-01-25']
    ];

    for (let i = 1; i < rows.length && i <= sampleData.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      const rowData = sampleData[i - 1];
      
      for (let j = 0; j < cells.length && j < rowData.length; j++) {
        cells[j].textContent = rowData[j];
      }
    }
  }

  // Method to create a project timeline table
  createTimelineTable(): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      // Create a 5x3 table for timeline
      const table = tableModule.insertTable(5, 3);
      
      setTimeout(() => {
        this.styleTable(table);
        this.populateTimelineTable(table);
      }, 100);
    }
  }

  // Populate timeline table
  private populateTimelineTable(table: any): void {
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    
    // Set header row
    if (rows[0]) {
      const headerCells = rows[0].querySelectorAll('th');
      if (headerCells.length >= 3) {
        headerCells[0].textContent = 'Phase';
        headerCells[1].textContent = 'Duration';
        headerCells[2].textContent = 'Milestone';
      }
    }

    // Set timeline data
    const timelineData = [
      ['Planning', '2 weeks', 'Project scope defined'],
      ['Design', '3 weeks', 'UI/UX mockups ready'],
      ['Development', '6 weeks', 'Core features complete'],
      ['Testing', '2 weeks', 'QA testing finished'],
      ['Deployment', '1 week', 'Live on production']
    ];

    for (let i = 1; i < rows.length && i <= timelineData.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      const rowData = timelineData[i - 1];
      
      for (let j = 0; j < cells.length && j < rowData.length; j++) {
        cells[j].textContent = rowData[j];
      }
    }
  }

  // Method to create a budget table
  createBudgetTable(): void {
    if (!this.quillEditor) return;

    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) {
      // Create a 4x4 table for budget
      const table = tableModule.insertTable(4, 4);
      
      setTimeout(() => {
        this.styleTable(table);
        this.populateBudgetTable(table);
      }, 100);
    }
  }

  // Populate budget table
  private populateBudgetTable(table: any): void {
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    
    // Set header row
    if (rows[0]) {
      const headerCells = rows[0].querySelectorAll('th');
      if (headerCells.length >= 4) {
        headerCells[0].textContent = 'Item';
        headerCells[1].textContent = 'Description';
        headerCells[2].textContent = 'Quantity';
        headerCells[3].textContent = 'Cost';
      }
    }

    // Set budget data
    const budgetData = [
      ['Design Services', 'UI/UX Design', '1', '$5,000'],
      ['Development', 'Frontend & Backend', '1', '$15,000'],
      ['Hosting', 'Annual hosting fees', '1', '$1,200'],
      ['Maintenance', 'Monthly support', '12', '$500/month']
    ];

    for (let i = 1; i < rows.length && i <= budgetData.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      const rowData = budgetData[i - 1];
      
      for (let j = 0; j < cells.length && j < rowData.length; j++) {
        cells[j].textContent = rowData[j];
      }
    }
  }
} 