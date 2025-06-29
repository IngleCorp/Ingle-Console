import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import * as FileSaver from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';

@Component({
  selector: 'app-view-document',
  templateUrl: './view-document.component.html',
  styleUrls: ['./view-document.component.scss']
})
export class ViewDocumentComponent {
  constructor(
    public dialogRef: MatDialogRef<ViewDocumentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  getDocumentIcon(type: string): string {
    switch (type) {
      case 'template': return 'description';
      case 'guide': return 'menu_book';
      case 'reference': return 'library_books';
      default: return 'article';
    }
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

  downloadDocument(): void {
    try {
      asBlob(this.data.document?.description).then((data: any) => {
        FileSaver.saveAs(data, `${this.data.document?.title}.docx`);
      });
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  }

  printDocument(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${this.data.document?.title} - Print</title>
            <style>
              body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                margin: 40px; 
                line-height: 1.6; 
                color: #2d3748;
              }
              h1 { 
                color: #2d3748; 
                border-bottom: 3px solid #667eea; 
                padding-bottom: 10px; 
                font-size: 32px;
              }
              h2 { 
                color: #2d3748; 
                border-bottom: 2px solid #e2e8f0; 
                padding-bottom: 6px; 
                font-size: 28px;
              }
              h3 { 
                color: #667eea; 
                font-size: 24px;
              }
              .meta { 
                background: #f8fafc; 
                padding: 15px; 
                border-radius: 8px; 
                margin-bottom: 20px; 
                border-left: 4px solid #667eea;
              }
              .content { 
                background: white; 
                padding: 20px; 
                border-radius: 8px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
              }
              ul, ol { padding-left: 24px; }
              li { margin-bottom: 8px; }
              a { color: #667eea; }
              img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
              @media print {
                body { margin: 20px; }
                .meta { background: #f8fafc !important; }
                .content { box-shadow: none !important; }
              }
            </style>
          </head>
          <body>
            <h1>${this.data.document?.title}</h1>
            <div class="meta">
              <strong>Type:</strong> ${this.data.document?.type || 'Document'} | 
              <strong>Tags:</strong> ${this.data.document?.tags?.join(', ') || 'None'} |
              <strong>Created:</strong> ${this.formatDate(this.data.document?.createdAt)} |
              <strong>Updated:</strong> ${this.formatDate(this.data.document?.updatedAt)}
            </div>
            <div class="content">${this.data.document?.description}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }
} 