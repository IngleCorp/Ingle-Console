import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'quill-table';

const OWN_PROJECTS_COLLECTION = 'ownProjects';
const DOCS_SUBCOLLECTION = 'docs';

@Component({
  selector: 'app-own-project-doc-editor',
  templateUrl: './own-project-doc-editor.component.html',
  styleUrls: ['./own-project-doc-editor.component.scss']
})
export class OwnProjectDocEditorComponent implements OnInit, OnDestroy {
  projectId: string | null = null;
  docId: string | null = null;
  isNewDoc = true;
  form: FormGroup;
  isSaving = false;
  isLoading = false;
  isExporting = false;
  private quillEditor: any;
  private docSub?: Subscription;

  editorModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ header: 1 }, { header: 2 }, { header: 3 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['clean'],
      ['link', 'image'],
      ['table']
    ],
    table: {
      operationMenu: {
        items: {
          unmergeCells: { text: 'Unmerge cells' }
        }
      }
    }
  };

  editorStyles = {
    height: '400px',
    backgroundColor: '#ffffff'
  };

  constructor(
    private fb: FormBuilder,
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      content: ['']
    });
  }

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    this.docId = this.route.snapshot.paramMap.get('docId') ?? null;
    this.isNewDoc = !this.docId || this.docId === 'new';
    if (this.isNewDoc) {
      this.form.patchValue({ name: 'Untitled Doc' });
    } else if (this.projectId && this.docId) {
      this.loadDoc();
    }
  }

  ngOnDestroy(): void {
    this.docSub?.unsubscribe();
  }

  loadDoc(): void {
    if (!this.projectId || !this.docId) return;
    this.isLoading = true;
    this.docSub = this.afs
      .collection(OWN_PROJECTS_COLLECTION)
      .doc(this.projectId)
      .collection(DOCS_SUBCOLLECTION)
      .doc(this.docId)
      .valueChanges()
      .subscribe({
        next: (data: any) => {
          if (data) {
            this.form.patchValue({
              name: data.name || 'Untitled Doc',
              content: data.content || ''
            });
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error loading doc', 'Close', { duration: 3000 });
        }
      });
  }

  onEditorCreated(editor: any): void {
    this.quillEditor = editor;
  }

  insertTable(): void {
    if (!this.quillEditor) return;
    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) tableModule.insertTable(3, 3);
  }

  addTableRow(): void {
    if (!this.quillEditor) return;
    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) tableModule.insertRow();
  }

  addTableColumn(): void {
    if (!this.quillEditor) return;
    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) tableModule.insertColumn();
  }

  deleteTableRow(): void {
    if (!this.quillEditor) return;
    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) tableModule.deleteRow();
  }

  deleteTableColumn(): void {
    if (!this.quillEditor) return;
    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) tableModule.deleteColumn();
  }

  mergeTableCells(): void {
    if (!this.quillEditor) return;
    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) tableModule.mergeCells();
  }

  splitTableCells(): void {
    if (!this.quillEditor) return;
    const tableModule = this.quillEditor.getModule('table');
    if (tableModule) tableModule.splitCell();
  }

  save(): void {
    if (this.form.invalid || !this.projectId) return;
    const name = this.form.get('name')?.value?.trim() || 'Untitled Doc';
    const content = this.form.get('content')?.value ?? '';
    this.isSaving = true;

    const payload = {
      name,
      content,
      updatedAt: new Date(),
      updatedBy: localStorage.getItem('userid') || '',
      updatedByName: localStorage.getItem('username') || 'Unknown'
    };

    if (this.isNewDoc) {
      const colRef = this.afs
        .collection(OWN_PROJECTS_COLLECTION)
        .doc(this.projectId)
        .collection(DOCS_SUBCOLLECTION);
      colRef.add({ ...payload, createdAt: new Date() }).then((docRef) => {
        this.isSaving = false;
        this.snackBar.open('Doc saved', 'Close', { duration: 2000 });
        this.router.navigate(['docs', docRef.id], { relativeTo: this.route.parent });
      }).catch(() => {
        this.isSaving = false;
        this.snackBar.open('Save failed', 'Close', { duration: 3000 });
      });
    } else {
      this.afs
        .collection(OWN_PROJECTS_COLLECTION)
        .doc(this.projectId)
        .collection(DOCS_SUBCOLLECTION)
        .doc(this.docId!)
        .update(payload)
        .then(() => {
          this.isSaving = false;
          this.snackBar.open('Saved', 'Close', { duration: 2000 });
        })
        .catch(() => {
          this.isSaving = false;
          this.snackBar.open('Save failed', 'Close', { duration: 3000 });
        });
    }
  }

  back(): void {
    this.router.navigate(['docs'], { relativeTo: this.route.parent });
  }

  get docFileName(): string {
    const name = this.form.get('name')?.value?.trim() || 'document';
    return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '_') || 'document';
  }

  copyShareUrl(): void {
    if (this.isNewDoc || !this.docId) {
      this.snackBar.open('Save the doc first to get a share link', 'Close', { duration: 3000 });
      return;
    }
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.snackBar.open('Link copied to clipboard', 'Close', { duration: 2000 });
      }).catch(() => this.fallbackCopyUrl(url));
    } else {
      this.fallbackCopyUrl(url);
    }
  }

  private fallbackCopyUrl(url: string): void {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.snackBar.open('Link copied to clipboard', 'Close', { duration: 2000 });
    } catch {
      this.snackBar.open('Copy failed. Share this link: ' + url, 'Close', { duration: 5000 });
    }
    document.body.removeChild(ta);
  }

  downloadAsPdf(): void {
    const content = this.form.get('content')?.value ?? '';
    const title = this.form.get('name')?.value?.trim() || 'Document';
    if (!content || !content.trim()) {
      this.snackBar.open('Add some content before exporting', 'Close', { duration: 2000 });
      return;
    }
    this.isExporting = true;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; font-size: 14px; line-height: 1.6; color: #1d1d1f;">
        <h1 style="margin: 0 0 16px; font-size: 22px;">${this.escapeHtml(title)}</h1>
        <div class="doc-body">${content}</div>
      </div>
    `;
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.width = '210mm';
    wrapper.style.background = '#fff';
    document.body.appendChild(wrapper);

    html2canvas(wrapper, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then((canvas) => {
      document.body.removeChild(wrapper);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const w = pdfW - margin * 2;
      const h = (canvas.height * w) / canvas.width;
      let heightLeft = h;
      let position = margin;
      pdf.addImage(imgData, 'PNG', margin, position, w, h);
      heightLeft -= pdfH;
      while (heightLeft > 0) {
        position = heightLeft - h + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, w, h);
        heightLeft -= pdfH;
      }
      pdf.save(`${this.docFileName}.pdf`);
      this.isExporting = false;
      this.snackBar.open('PDF downloaded', 'Close', { duration: 2000 });
    }).catch(() => {
      document.body.removeChild(wrapper);
      this.isExporting = false;
      this.snackBar.open('PDF export failed', 'Close', { duration: 3000 });
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  downloadAsDoc(): void {
    const content = this.form.get('content')?.value ?? '';
    if (!content || !content.trim()) {
      this.snackBar.open('Add some content before exporting', 'Close', { duration: 2000 });
      return;
    }
    this.isExporting = true;
    const title = this.form.get('name')?.value?.trim() || 'Document';
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>${this.escapeHtml(title)}</title></head>
        <body>
          <h1>${this.escapeHtml(title)}</h1>
          <div>${content}</div>
        </body>
      </html>
    `;
    asBlob(html).then((data: Blob | Buffer) => {
      const blob = data instanceof Blob ? data : new Blob([data]);
      saveAs(blob, `${this.docFileName}.docx`);
      this.isExporting = false;
      this.snackBar.open('Word document downloaded', 'Close', { duration: 2000 });
    }).catch(() => {
      this.isExporting = false;
      this.snackBar.open('DOC export failed', 'Close', { duration: 3000 });
    });
  }
}
