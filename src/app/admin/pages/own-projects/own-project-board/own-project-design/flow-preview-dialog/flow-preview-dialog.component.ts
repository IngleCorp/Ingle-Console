import { Component, Inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface FlowPreviewDialogData {
  title: string;
  mermaidCode: string;
}

@Component({
  selector: 'app-flow-preview-dialog',
  templateUrl: './flow-preview-dialog.component.html',
  styleUrls: ['./flow-preview-dialog.component.scss']
})
export class FlowPreviewDialogComponent implements AfterViewInit {
  @ViewChild('mermaidWrap') mermaidWrap?: ElementRef<HTMLDivElement>;

  zoom = 1;
  readonly minZoom = 0.25;
  readonly maxZoom = 3;
  readonly zoomStep = 0.25;

  constructor(
    public dialogRef: MatDialogRef<FlowPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FlowPreviewDialogData
  ) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.render(), 150);
  }

  zoomIn(): void {
    this.zoom = Math.min(this.maxZoom, this.zoom + this.zoomStep);
  }

  zoomOut(): void {
    this.zoom = Math.max(this.minZoom, this.zoom - this.zoomStep);
  }

  resetZoom(): void {
    this.zoom = 1;
  }

  render(): void {
    const mermaid = (window as any).mermaid;
    if (!mermaid || !this.data?.mermaidCode?.trim() || !this.mermaidWrap?.nativeElement) return;
    const el = this.mermaidWrap.nativeElement;
    el.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'mermaid';
    pre.textContent = this.data.mermaidCode;
    el.appendChild(pre);
    mermaid.run({ nodes: [pre] }).catch(() => {
      el.innerHTML = '<p class="mermaid-error">Could not render diagram.</p>';
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
