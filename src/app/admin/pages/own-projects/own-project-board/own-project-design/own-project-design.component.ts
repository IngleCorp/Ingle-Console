import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { FlowPreviewDialogComponent } from './flow-preview-dialog/flow-preview-dialog.component';

const OWN_PROJECTS_COLLECTION = 'ownProjects';
const DESIGN_DOC_ID = 'main';

export interface CanvasData {
  problem?: string;
  solution?: string;
  keyMetrics?: string;
  uvp?: string;
  unfairAdvantage?: string;
  customerSegments?: string;
  channels?: string;
  costStructure?: string;
  revenueStreams?: string;
}

export interface FlowDiagramItem {
  id: string;
  title: string;
  mermaidCode: string;
  order?: number;
}

@Component({
  selector: 'app-own-project-design',
  templateUrl: './own-project-design.component.html',
  styleUrls: ['./own-project-design.component.scss']
})
export class OwnProjectDesignComponent implements OnInit, OnDestroy {
  @ViewChild('mermaidContainer') mermaidContainer?: ElementRef<HTMLDivElement>;

  projectId: string | null = null;
  activeTab: 'canvas' | 'flow' = 'canvas';
  isLoading = false;
  isSaving = false;
  mermaidLoaded = false;
  mermaidError: string | null = null;

  canvas: CanvasData = {
    problem: '',
    solution: '',
    keyMetrics: '',
    uvp: '',
    unfairAdvantage: '',
    customerSegments: '',
    channels: '',
    costStructure: '',
    revenueStreams: ''
  };

  flowDiagrams: FlowDiagramItem[] = [];
  editingFlowId: string | null = null;
  flowFormTitle = '';
  flowFormCode = '';
  private designSub?: Subscription;

  canvasSections: { key: keyof CanvasData; label: string; icon: string; hint: string }[] = [
    { key: 'problem', label: 'Problem', icon: 'warning', hint: 'Top 3 problems you are solving' },
    { key: 'solution', label: 'Solution', icon: 'lightbulb', hint: 'Top 3 features / solutions' },
    { key: 'keyMetrics', label: 'Key Metrics', icon: 'trending_up', hint: 'Key numbers that matter' },
    { key: 'uvp', label: 'Unique Value Proposition', icon: 'star', hint: 'One-liner that wins' },
    { key: 'unfairAdvantage', label: 'Unfair Advantage', icon: 'shield', hint: 'What you have that others don\'t' },
    { key: 'customerSegments', label: 'Customer Segments', icon: 'people', hint: 'Target customers' },
    { key: 'channels', label: 'Channels', icon: 'campaign', hint: 'How you reach customers' },
    { key: 'costStructure', label: 'Cost Structure', icon: 'account_balance_wallet', hint: 'Main costs' },
    { key: 'revenueStreams', label: 'Revenue Streams', icon: 'payments', hint: 'How you make money' }
  ];

  flowExample = `flowchart LR
    A[User] --> B[Login]
    B --> C{Dashboard}
    C --> D[Tasks]
    C --> E[Reports]
    D --> F[Complete]`;

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.parent?.paramMap?.subscribe(params => {
      this.projectId = params.get('projectId') ?? null;
      this.designSub?.unsubscribe();
      if (this.projectId) {
        this.loadDesign();
        this.loadMermaidScript();
      } else {
        this.canvas = { problem: '', solution: '', keyMetrics: '', uvp: '', unfairAdvantage: '', customerSegments: '', channels: '', costStructure: '', revenueStreams: '' };
        this.flowDiagrams = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.designSub?.unsubscribe();
  }

  loadDesign(): void {
    if (!this.projectId) return;
    this.isLoading = true;
    this.designSub = this.afs
      .collection(OWN_PROJECTS_COLLECTION)
      .doc(this.projectId)
      .collection('design')
      .doc(DESIGN_DOC_ID)
      .valueChanges()
      .subscribe({
        next: (data: any) => {
          if (data?.canvas) {
            this.canvas = { ...this.canvas, ...data.canvas };
          }
          if (Array.isArray(data?.flowDiagrams)) {
            this.flowDiagrams = data.flowDiagrams;
          } else if (data?.flowDiagramMermaid != null && data?.flowDiagramMermaid !== '') {
            this.flowDiagrams = [{ id: 'legacy', title: 'Flow diagram', mermaidCode: data.flowDiagramMermaid, order: 0 }];
          } else {
            this.flowDiagrams = [];
          }
          this.isLoading = false;
          if (this.activeTab === 'flow' && this.mermaidLoaded) {
            setTimeout(() => this.renderAllFlowPreviews(), 300);
          }
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error loading design', 'Close', { duration: 3000 });
        }
      });
  }

  loadMermaidScript(): void {
    if ((window as any).mermaid) {
      this.mermaidLoaded = true;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      (window as any).mermaid?.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
      this.mermaidLoaded = true;
      if (this.activeTab === 'flow') this.renderMermaid();
    };
    script.onerror = () => {
      this.mermaidError = 'Could not load diagram library. Check your connection.';
    };
    document.head.appendChild(script);
  }

  setTab(tab: 'canvas' | 'flow'): void {
    this.activeTab = tab;
    if (tab === 'flow' && this.mermaidLoaded) {
      setTimeout(() => this.renderAllFlowPreviews(), 200);
    }
  }

  saveCanvas(): void {
    if (!this.projectId) return;
    this.isSaving = true;
    const payload = {
      canvas: this.canvas,
      updatedAt: new Date(),
      updatedBy: localStorage.getItem('userid') || '',
      updatedByName: localStorage.getItem('username') || 'Unknown'
    };
    this.afs
      .collection(OWN_PROJECTS_COLLECTION)
      .doc(this.projectId)
      .collection('design')
      .doc(DESIGN_DOC_ID)
      .set(payload, { merge: true })
      .then(() => {
        this.snackBar.open('Canvas saved', 'Close', { duration: 2000 });
        this.isSaving = false;
      })
      .catch(() => {
        this.snackBar.open('Save failed', 'Close', { duration: 3000 });
        this.isSaving = false;
      });
  }

  startAddFlow(): void {
    this.editingFlowId = null;
    this.flowFormTitle = '';
    this.flowFormCode = '';
  }

  editFlow(diagram: FlowDiagramItem): void {
    this.editingFlowId = diagram.id;
    this.flowFormTitle = diagram.title;
    this.flowFormCode = diagram.mermaidCode;
  }

  cancelFlowForm(): void {
    this.editingFlowId = null;
    this.flowFormTitle = '';
    this.flowFormCode = '';
  }

  saveFlowDiagram(): void {
    const title = this.flowFormTitle?.trim();
    if (!title) {
      this.snackBar.open('Enter a title', 'Close', { duration: 2000 });
      return;
    }
    if (!this.projectId) return;
    this.isSaving = true;
    let nextDiagrams: FlowDiagramItem[];
    if (this.editingFlowId) {
      nextDiagrams = this.flowDiagrams.map(d =>
        d.id === this.editingFlowId
          ? { ...d, title, mermaidCode: this.flowFormCode }
          : d
      );
    } else {
      const newId = 'flow-' + Date.now();
      nextDiagrams = [...this.flowDiagrams, { id: newId, title, mermaidCode: this.flowFormCode, order: this.flowDiagrams.length }];
    }
    this.afs
      .collection(OWN_PROJECTS_COLLECTION)
      .doc(this.projectId)
      .collection('design')
      .doc(DESIGN_DOC_ID)
      .set(
        {
          flowDiagrams: nextDiagrams,
          updatedAt: new Date(),
          updatedBy: localStorage.getItem('userid') || '',
          updatedByName: localStorage.getItem('username') || 'Unknown'
        },
        { merge: true }
      )
      .then(() => {
        this.flowDiagrams = nextDiagrams;
        this.snackBar.open(this.editingFlowId ? 'Diagram updated' : 'Diagram saved', 'Close', { duration: 2000 });
        this.isSaving = false;
        this.cancelFlowForm();
        setTimeout(() => this.renderAllFlowPreviews(), 200);
      })
      .catch(() => {
        this.snackBar.open('Save failed', 'Close', { duration: 3000 });
        this.isSaving = false;
      });
  }

  deleteFlowDiagram(id: string): void {
    if (!confirm('Delete this flow diagram?')) return;
    if (!this.projectId) return;
    const nextDiagrams = this.flowDiagrams.filter(d => d.id !== id);
    this.isSaving = true;
    this.afs
      .collection(OWN_PROJECTS_COLLECTION)
      .doc(this.projectId)
      .collection('design')
      .doc(DESIGN_DOC_ID)
      .set(
        {
          flowDiagrams: nextDiagrams,
          updatedAt: new Date(),
          updatedBy: localStorage.getItem('userid') || '',
          updatedByName: localStorage.getItem('username') || 'Unknown'
        },
        { merge: true }
      )
      .then(() => {
        this.flowDiagrams = nextDiagrams;
        if (this.editingFlowId === id) this.cancelFlowForm();
        this.snackBar.open('Diagram deleted', 'Close', { duration: 2000 });
        this.isSaving = false;
      })
      .catch(() => {
        this.snackBar.open('Delete failed', 'Close', { duration: 3000 });
        this.isSaving = false;
      });
  }

  renderAllFlowPreviews(): void {
    const mermaid = (window as any).mermaid;
    if (!mermaid) return;
    const nodes = document.querySelectorAll('.flow-diagram-preview pre.mermaid');
    if (!nodes.length) return;
    mermaid.run({ nodes: Array.from(nodes) }).catch(() => {});
  }

  openPreview(diagram: FlowDiagramItem): void {
    this.dialog.open(FlowPreviewDialogComponent, {
      width: '90vw',
      maxWidth: '900px',
      maxHeight: '90vh',
      data: { title: diagram.title, mermaidCode: diagram.mermaidCode }
    });
  }

  downloadAsImage(diagram: FlowDiagramItem): void {
    const el = document.getElementById('flow-preview-' + diagram.id);
    if (!el) {
      this.snackBar.open('Diagram not ready. Wait for preview to render.', 'Close', { duration: 3000 });
      return;
    }
    html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
      canvas.toBlob(blob => {
        if (blob) {
          const name = (diagram.title || 'flow-diagram').replace(/[^a-z0-9-_]/gi, '-');
          saveAs(blob, name + '.png');
          this.snackBar.open('Image downloaded', 'Close', { duration: 2000 });
        }
      }, 'image/png');
    }).catch(() => {
      this.snackBar.open('Download failed', 'Close', { duration: 3000 });
    });
  }

  downloadAsSvg(diagram: FlowDiagramItem): void {
    const el = document.getElementById('flow-preview-' + diagram.id);
    if (!el) {
      this.snackBar.open('Diagram not ready. Wait for preview to render.', 'Close', { duration: 3000 });
      return;
    }
    const svg = el.querySelector('svg');
    if (!svg) {
      this.snackBar.open('No diagram to export. Save and ensure it renders.', 'Close', { duration: 3000 });
      return;
    }
    const svgStr = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const name = (diagram.title || 'flow-diagram').replace(/[^a-z0-9-_]/gi, '-');
    saveAs(blob, name + '.svg');
    this.snackBar.open('SVG downloaded', 'Close', { duration: 2000 });
  }

  renderMermaid(): void {
    const mermaid = (window as any).mermaid;
    if (!mermaid || !this.mermaidContainer?.nativeElement || !this.flowFormCode?.trim()) {
      return;
    }
    const el = this.mermaidContainer.nativeElement;
    el.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'mermaid';
    pre.textContent = this.flowFormCode;
    el.appendChild(pre);
    mermaid.run({ nodes: [pre] }).catch(() => {
      el.innerHTML = `<p class="mermaid-error">Invalid diagram syntax. Check the <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" rel="noopener">Mermaid docs</a>.</p>`;
    });
  }

  useFlowExample(): void {
    this.flowFormCode = this.flowExample;
  }
}
