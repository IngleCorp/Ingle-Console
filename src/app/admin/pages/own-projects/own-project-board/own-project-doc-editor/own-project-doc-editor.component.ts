import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Quill from 'quill';
import QuillBetterTable from 'quill-better-table';

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
  /** Show the row/col form for inserting a new table */
  showInsertTablePanel = false;
  insertTableRows = 3;
  insertTableCols = 3;
  readonly maxTableRows = 20;
  readonly maxTableCols = 12;
  /** True when cursor/selection is inside a table – show table ops toolbar */
  isTableSelected = false;
  /** Right-click context menu on table */
  tableContextMenuVisible = false;
  tableContextMenuX = 0;
  tableContextMenuY = 0;
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
      ['link', 'image']
    ],
    table: false,
    keyboard: {
      bindings: QuillBetterTable.keyboardBindings
    },
    'better-table': {
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

  @HostListener('document:click')
  closeTableContextMenuOnClick(): void {
    this.tableContextMenuVisible = false;
  }

  @HostListener('document:contextmenu')
  closeTableContextMenuOnRightClick(): void {
    this.tableContextMenuVisible = false;
  }

  onEditorContextMenu(event: MouseEvent): void {
    const target = event.target as Node;
    const el = target?.nodeType === Node.ELEMENT_NODE ? (target as Element) : (target as Element)?.parentElement;
    const inTable = el?.closest?.('td') || el?.closest?.('th');
    if (inTable) {
      event.preventDefault();
      event.stopPropagation();
      const menuWidth = 180;
      const menuHeight = 280;
      let x = event.clientX;
      let y = event.clientY;
      if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
      if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 8;
      if (x < 8) x = 8;
      if (y < 8) y = 8;
      this.tableContextMenuX = x;
      this.tableContextMenuY = y;
      this.tableContextMenuVisible = true;
    }
  }

  closeTableContextMenu(): void {
    this.tableContextMenuVisible = false;
  }

  ctxDeleteRow(): void { this.deleteTableRow(); this.closeTableContextMenu(); }
  ctxDeleteColumn(): void { this.deleteTableColumn(); this.closeTableContextMenu(); }
  ctxMergeCells(): void { this.mergeTableCells(); this.closeTableContextMenu(); }
  ctxSplitCell(): void { this.splitTableCells(); this.closeTableContextMenu(); }

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
    editor.on('selection-change', () => {
      setTimeout(() => this.updateTableSelectionState(), 0);
    });
  }

  /** Detect if cursor is inside a table using Quill selection + getLeaf (avoids window.getSelection() desync). */
  private updateTableSelectionState(): void {
    if (!this.quillEditor) {
      this.isTableSelected = false;
      return;
    }
    const range = this.quillEditor.getSelection();
    if (!range) {
      this.isTableSelected = false;
      return;
    }
    try {
      const [leaf] = this.quillEditor.getLeaf(range.index);
      const domNode = leaf?.domNode;
      this.isTableSelected = !!(domNode && (domNode as Element).closest?.('td, th'));
    } catch {
      this.isTableSelected = false;
    }
  }

  openInsertTablePanel(): void {
    this.insertTableRows = 3;
    this.insertTableCols = 3;
    this.showInsertTablePanel = true;
  }

  cancelInsertTable(): void {
    this.showInsertTablePanel = false;
  }

  confirmInsertTable(): void {
    const rows = Math.max(1, Math.min(this.maxTableRows, this.insertTableRows));
    const cols = Math.max(1, Math.min(this.maxTableCols, this.insertTableCols));
    this.insertTable(rows, cols);
    this.showInsertTablePanel = false;
  }

  private getBetterTable(): any {
    return this.quillEditor?.getModule?.('better-table');
  }

  /** Build rect in coordinate system expected by quill-better-table (relative to container). */
  private getRelativeRect(targetRect: DOMRect, container: Element): { x: number; y: number; x1: number; y1: number; width: number; height: number } {
    const cr = container.getBoundingClientRect();
    const x = targetRect.left - cr.left - container.scrollLeft;
    const y = targetRect.top - cr.top - container.scrollTop;
    return {
      x,
      y,
      x1: x + targetRect.width,
      y1: y + targetRect.height,
      width: targetRect.width,
      height: targetRect.height
    };
  }

  /** Column index of cell in its row (for insertColumn/deleteColumn). */
  private getCellColIndex(row: any, cell: any): number {
    let colIndex = 0;
    if (!row?.children) return 0;
    let node = row.children.head;
    while (node && node !== cell) {
      colIndex += parseInt(node.formats?.()?.colspan || '1', 10);
      node = node.next;
    }
    return colIndex;
  }

  insertTable(rows: number, cols: number): void {
    const bt = this.getBetterTable();
    if (!bt) return;
    bt.insertTable(rows, cols);
  }

  insertRowAbove(): void {
    const bt = this.getBetterTable();
    if (!bt) return;
    const [tableContainer, row, cell] = bt.getTable() ?? [];
    if (!tableContainer || !row || !cell) {
      this.snackBar.open('Click inside a table cell first', 'Close', { duration: 2500 });
      return;
    }
    const wrapper = this.quillEditor.root.parentNode;
    const compareRect = this.getRelativeRect(cell.domNode.getBoundingClientRect(), wrapper);
    tableContainer.insertRow(compareRect, false, wrapper);
    this.quillEditor.update(Quill.sources.USER);
    this.snackBar.open('Row inserted above', 'Close', { duration: 2000 });
  }

  insertRowBelow(): void {
    const bt = this.getBetterTable();
    if (!bt) return;
    const [tableContainer, row, cell] = bt.getTable() ?? [];
    if (!tableContainer || !row || !cell) {
      this.snackBar.open('Click inside a table cell first', 'Close', { duration: 2500 });
      return;
    }
    const wrapper = this.quillEditor.root.parentNode;
    const compareRect = this.getRelativeRect(cell.domNode.getBoundingClientRect(), wrapper);
    tableContainer.insertRow(compareRect, true, wrapper);
    this.quillEditor.update(Quill.sources.USER);
    this.snackBar.open('Row inserted below', 'Close', { duration: 2000 });
  }

  insertColumnBefore(): void {
    const bt = this.getBetterTable();
    if (!bt) return;
    const [tableContainer, row, cell] = bt.getTable() ?? [];
    if (!tableContainer || !row || !cell) {
      this.snackBar.open('Click inside a table cell first', 'Close', { duration: 2500 });
      return;
    }
    const wrapper = this.quillEditor.root.parentNode;
    const compareRect = this.getRelativeRect(cell.domNode.getBoundingClientRect(), wrapper);
    const colIndex = this.getCellColIndex(row, cell);
    tableContainer.insertColumn(compareRect, colIndex, false, wrapper);
    this.quillEditor.update(Quill.sources.USER);
    this.snackBar.open('Column inserted before', 'Close', { duration: 2000 });
  }

  insertColumnAfter(): void {
    const bt = this.getBetterTable();
    if (!bt) return;
    const [tableContainer, row, cell] = bt.getTable() ?? [];
    if (!tableContainer || !row || !cell) {
      this.snackBar.open('Click inside a table cell first', 'Close', { duration: 2500 });
      return;
    }
    const wrapper = this.quillEditor.root.parentNode;
    const compareRect = this.getRelativeRect(cell.domNode.getBoundingClientRect(), wrapper);
    const colIndex = this.getCellColIndex(row, cell);
    tableContainer.insertColumn(compareRect, colIndex, true, wrapper);
    this.quillEditor.update(Quill.sources.USER);
    this.snackBar.open('Column inserted after', 'Close', { duration: 2000 });
  }

  addTableRow(): void {
    this.insertRowBelow();
  }

  addTableColumn(): void {
    this.insertColumnAfter();
  }

  deleteTableRow(): void {
    const bt = this.getBetterTable();
    if (!bt) return;
    const [tableContainer, row] = bt.getTable() ?? [];
    if (!tableContainer || !row) {
      this.snackBar.open('Click inside a table cell first', 'Close', { duration: 2500 });
      return;
    }
    const wrapper = this.quillEditor.root.parentNode;
    const compareRect = this.getRelativeRect(row.domNode.getBoundingClientRect(), wrapper);
    tableContainer.deleteRow(compareRect, wrapper);
    this.quillEditor.update(Quill.sources.USER);
    this.snackBar.open('Row deleted', 'Close', { duration: 2000 });
  }

  deleteTableColumn(): void {
    const bt = this.getBetterTable();
    if (!bt) return;
    const [tableContainer, row, cell] = bt.getTable() ?? [];
    if (!tableContainer || !row || !cell) {
      this.snackBar.open('Click inside a table cell first', 'Close', { duration: 2500 });
      return;
    }
    const wrapper = this.quillEditor.root.parentNode;
    const compareRect = this.getRelativeRect(cell.domNode.getBoundingClientRect(), wrapper);
    const colIndex = this.getCellColIndex(row, cell);
    const isDeleteTable = tableContainer.deleteColumns(compareRect, [colIndex], wrapper);
    this.quillEditor.update(Quill.sources.USER);
    if (!isDeleteTable) this.snackBar.open('Column deleted', 'Close', { duration: 2000 });
  }

  mergeTableCells(): void {
    const bt = this.getBetterTable();
    if (!bt) return;
    const tableSelection = bt.tableSelection;
    const selectedTds = tableSelection?.selectedTds ?? [];
    if (selectedTds.length < 2) {
      this.snackBar.open('Select multiple cells to merge (drag to select)', 'Close', { duration: 3000 });
      return;
    }
    const [tableContainer] = bt.getTable() ?? [];
    if (!tableContainer || !tableSelection?.boundary) return;
    const boundary = tableSelection.boundary;
    const wrapper = this.quillEditor.root.parentNode;
    const columnToolCells = bt.columnTool?.colToolCells?.() ?? [];
    const rowspan = (tableContainer.rows?.() ?? []).reduce((sum: number, r: any) => {
      const rowRect = this.getRelativeRect(r.domNode.getBoundingClientRect(), wrapper);
      if (rowRect.y >= boundary.y - 5 && rowRect.y + rowRect.height <= boundary.y + boundary.height + 5) sum += 1;
      return sum;
    }, 0) || 1;
    const colspan = columnToolCells.length > 0
      ? columnToolCells.reduce((sum: number, c: Element) => {
          const cellRect = this.getRelativeRect(c.getBoundingClientRect(), wrapper);
          if (cellRect.x >= boundary.x - 5 && cellRect.x + cellRect.width <= boundary.x + boundary.width + 5) sum += 1;
          return sum;
        }, 0)
      : selectedTds.length;
    tableContainer.mergeCells(boundary, selectedTds, rowspan, colspan, wrapper);
    this.quillEditor.update(Quill.sources.USER);
    this.snackBar.open('Cells merged', 'Close', { duration: 2000 });
  }

  splitTableCells(): void {
    const bt = this.getBetterTable();
    if (!bt) return;
    const tableSelection = bt.tableSelection;
    const selectedTds = tableSelection?.selectedTds ?? [];
    const [tableContainer] = bt.getTable() ?? [];
    if (!tableContainer || selectedTds.length === 0) {
      this.snackBar.open('Click inside a merged cell first', 'Close', { duration: 2500 });
      return;
    }
    tableContainer.unmergeCells(selectedTds, this.quillEditor.root.parentNode);
    this.quillEditor.update(Quill.sources.USER);
    this.snackBar.open('Cells unmerged', 'Close', { duration: 2000 });
  }

  save(): void {
    if (this.form.invalid || !this.projectId) return;
    const name = this.form.get('name')?.value?.trim() || 'Untitled Doc';
    // Use editor DOM HTML when available so merged/split tables (colspan/rowspan) are saved correctly
    const content = this.quillEditor?.root?.innerHTML ?? this.form.get('content')?.value ?? '';
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
    const content = this.quillEditor?.root?.innerHTML ?? this.form.get('content')?.value ?? '';
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
    const content = this.quillEditor?.root?.innerHTML ?? this.form.get('content')?.value ?? '';
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
