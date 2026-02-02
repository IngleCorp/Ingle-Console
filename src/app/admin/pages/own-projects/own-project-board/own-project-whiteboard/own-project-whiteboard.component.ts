import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  HostListener
} from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import {
  Canvas,
  PencilBrush,
  Rect,
  Circle,
  Line,
  IText,
  FabricObject,
  Polygon,
  Group,
  Triangle,
  Polyline,
  Point
} from 'fabric';

const OWN_PROJECTS_COLLECTION = 'ownProjects';
const WHITEBOARD_DOC_ID = 'whiteboard';

// Custom properties to serialize
const CUSTOM_PROPS = ['shapeId', 'isArrow', 'isConnector', 'connectionData', 'boundTextId', 'boundToShapeId'];

export type DrawingTool =
  | 'select'
  | 'pan'
  | 'pen'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'roundedRect'
  | 'diamond'
  | 'parallelogram'
  | 'circle'
  | 'text'
  | 'stickyNote'
  | 'eraser';

interface ToolDef {
  id: DrawingTool;
  icon: string;
  label: string;
}

// Arrow connection data stored on the arrow itself
interface ArrowConnectionData {
  fromShapeId: string | null;
  toShapeId: string | null;
  fromAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  toAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
}

let shapeIdCounter = 0;
function generateShapeId(): string {
  return `shape_${Date.now()}_${++shapeIdCounter}`;
}

@Component({
  selector: 'app-own-project-whiteboard',
  templateUrl: './own-project-whiteboard.component.html',
  styleUrls: ['./own-project-whiteboard.component.scss']
})
export class OwnProjectWhiteboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('whiteboardPage') whiteboardPage!: ElementRef<HTMLDivElement>;

  projectId: string | null = null;
  canvas!: Canvas;
  isLoading = false;
  isSaving = false;
  hasUnsavedChanges = false;

  // Tool state
  activeTool: DrawingTool = 'select';
  strokeColor = '#1d1d1f';
  fillColor = '#ffffff';
  strokeWidth = 2;
  fontSize = 16;

  // Undo/Redo
  history: string[] = [];
  historyIndex = -1;
  private isLoadingState = false;

  // Drawing state
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private activeShape: FabricObject | null = null;

  private whiteboardSub?: Subscription;

  // Zoom & Pan state
  zoom = 1;
  readonly minZoom = 0.1;
  readonly maxZoom = 5;
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private spacebarHeld = false;

  // Fullscreen state
  isFullscreen = false;

  // Tool groups for UI
  basicTools: ToolDef[] = [
    { id: 'select', icon: 'near_me', label: 'Select (V)' },
    { id: 'pan', icon: 'pan_tool', label: 'Pan / Hand (H)' },
    { id: 'pen', icon: 'edit', label: 'Pen (P)' },
    { id: 'eraser', icon: 'auto_fix_normal', label: 'Eraser (E)' }
  ];

  shapeTools: ToolDef[] = [
    { id: 'rectangle', icon: 'crop_square', label: 'Rectangle - Process' },
    { id: 'roundedRect', icon: 'rounded_corner', label: 'Rounded Rect - Start/End' },
    { id: 'diamond', icon: 'change_history', label: 'Diamond - Decision' },
    { id: 'parallelogram', icon: 'filter_none', label: 'Parallelogram - Input/Output' },
    { id: 'circle', icon: 'radio_button_unchecked', label: 'Circle - Connector' }
  ];

  connectorTools: ToolDef[] = [
    { id: 'line', icon: 'remove', label: 'Line' },
    { id: 'arrow', icon: 'arrow_forward', label: 'Arrow Connector' }
  ];

  textTools: ToolDef[] = [
    { id: 'text', icon: 'text_fields', label: 'Text (T)' },
    { id: 'stickyNote', icon: 'sticky_note_2', label: 'Sticky Note' }
  ];

  strokeWidths = [1, 2, 3, 4, 6];

  colors = [
    '#1d1d1f', '#ffffff', '#ff3b30', '#ff9500', '#ffcc00',
    '#34c759', '#007aff', '#5856d6', '#af52de', '#ff2d55'
  ];

  fillColors = [
    'transparent', '#ffffff', '#fff3cd', '#cfe2ff', '#d1e7dd',
    '#f8d7da', '#e2d9f3', '#ffe5d0', '#d3d3d3', '#1d1d1f'
  ];

  // Table dialog
  showTableDialog = false;
  tableRows = 3;
  tableCols = 3;

  // Arrow connection mode
  arrowConnectMode: 'idle' | 'selectingFrom' | 'selectingTo' = 'idle';
  pendingArrowFrom: FabricObject | null = null;

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initCanvas(), 100);
  }

  ngOnDestroy(): void {
    this.whiteboardSub?.unsubscribe();
    if (this.canvas) {
      this.canvas.dispose();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    // Skip shortcuts when typing in input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    // Skip shortcuts when editing text in canvas (IText)
    if (this.isEditingText()) {
      // Only handle Escape to exit text editing
      if (e.key === 'Escape') {
        const activeObj = this.canvas.getActiveObject();
        if (activeObj && activeObj.type === 'i-text') {
          (activeObj as IText).exitEditing();
          this.canvas.renderAll();
        }
      }
      return;
    }

    // Spacebar for temporary pan mode
    if (e.code === 'Space' && !this.spacebarHeld) {
      this.spacebarHeld = true;
      this.canvas.defaultCursor = 'grab';
      e.preventDefault();
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'v': this.setTool('select'); break;
      case 'h': this.setTool('pan'); break;
      case 'p': this.setTool('pen'); break;
      case 'e': this.setTool('eraser'); break;
      case 't': this.setTool('text'); break;
      case 'r': this.setTool('rectangle'); break;
      case 'a': this.setTool('arrow'); break;
      case 'f':
        this.toggleFullscreen();
        break;
      case '0':
        if (e.metaKey || e.ctrlKey) {
          this.resetView();
          e.preventDefault();
        }
        break;
      case '=':
      case '+':
        if (e.metaKey || e.ctrlKey) {
          this.zoomIn();
          e.preventDefault();
        }
        break;
      case '-':
        if (e.metaKey || e.ctrlKey) {
          this.zoomOut();
          e.preventDefault();
        }
        break;
      case 'escape':
        // Browser handles fullscreen exit automatically
        this.cancelArrowConnection();
        break;
      case 'delete':
      case 'backspace':
        this.deleteSelected();
        break;
      case 'z':
        if (e.metaKey || e.ctrlKey) {
          e.shiftKey ? this.redo() : this.undo();
          e.preventDefault();
        }
        break;
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    // Skip when editing text
    if (this.isEditingText()) return;

    // Release spacebar pan mode
    if (e.code === 'Space') {
      this.spacebarHeld = false;
      this.isPanning = false;
      // Restore cursor based on current tool
      if (this.activeTool === 'pan') {
        this.canvas.defaultCursor = 'grab';
      } else {
        this.canvas.defaultCursor = 'default';
      }
    }
  }

  private isEditingText(): boolean {
    const active = this.canvas?.getActiveObject();
    return active?.type === 'i-text' && (active as IText).isEditing;
  }

  private initCanvas(): void {
    const container = this.canvasContainer?.nativeElement;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.canvas = new Canvas(this.canvasEl.nativeElement, {
      width,
      height,
      backgroundColor: '#f8f9fa',
      selection: true
    });

    this.setupPenBrush();
    this.setupCanvasEvents();
    this.loadWhiteboard();
    this.saveHistory();
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.canvasContainer?.nativeElement) return;
    const container = this.canvasContainer.nativeElement;
    this.canvas.setDimensions({
      width: container.clientWidth,
      height: container.clientHeight
    });
    this.canvas.renderAll();
  }

  private setupPenBrush(): void {
    const brush = new PencilBrush(this.canvas);
    brush.color = this.strokeColor;
    brush.width = this.strokeWidth;
    this.canvas.freeDrawingBrush = brush;
  }

  private setupCanvasEvents(): void {
    this.canvas.on('mouse:down', (e) => this.onMouseDown(e));
    this.canvas.on('mouse:move', (e) => this.onMouseMove(e));
    this.canvas.on('mouse:up', (e) => this.onMouseUp(e));
    this.canvas.on('object:added', () => this.onObjectModified());
    this.canvas.on('object:modified', () => this.onObjectModified());
    this.canvas.on('object:removed', (e) => this.onObjectRemoved(e));
    this.canvas.on('path:created', () => this.onObjectModified());
    // Key event: object:moving for live arrow updates
    this.canvas.on('object:moving', (e) => this.onObjectMoving(e));
    this.canvas.on('mouse:dblclick', (e) => this.onDoubleClick(e));
    // Mouse wheel for zoom
    this.canvas.on('mouse:wheel', (opt) => this.onMouseWheel(opt));
    // Handle text editing exit and cleanup
    this.canvas.on('text:editing:exited', (e) => this.onTextEditingExited(e));
    this.canvas.on('selection:cleared', () => this.onSelectionCleared());
  }

  // Clean up empty text when editing ends, or finish shape text editing
  private onTextEditingExited(e: any): void {
    const textObj = e.target as IText;
    if (!textObj) return;

    // Check if this text was being edited as part of a shape group
    if ((textObj as any)._editingGroup) {
      setTimeout(() => {
        this.finishEditingShapeText(textObj);
      }, 10);
      return;
    }

    // Regular text - remove if empty
    if (!textObj.text || textObj.text.trim() === '') {
      setTimeout(() => {
        this.canvas.remove(textObj);
        this.canvas.renderAll();
      }, 10);
    }
  }

  // Handle selection cleared
  private onSelectionCleared(): void {
    // Clean up any editing text objects
    const editingTexts = this.canvas.getObjects().filter((o: any) => o._editingGroup);
    editingTexts.forEach((textObj: any) => {
      if (textObj.type === 'i-text' && !(textObj as IText).isEditing) {
        this.finishEditingShapeText(textObj as IText);
      }
    });
  }

  // Mouse wheel: scroll = pan canvas (infinite canvas). Use Ctrl/Cmd + wheel to zoom.
  private onMouseWheel(opt: any): void {
    const e = opt.e;

    // Ctrl or Cmd + wheel = zoom; otherwise wheel = pan (scroll)
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY;
      let newZoom = this.canvas.getZoom() * (delta > 0 ? 0.9 : 1.1);
      newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
      const pointer = this.canvas.getScenePoint(e);
      this.canvas.zoomToPoint(pointer, newZoom);
      this.zoom = newZoom;
    } else {
      // Scroll = pan the canvas (infinite canvas)
      const deltaX = -e.deltaX;
      const deltaY = -e.deltaY;
      const vpt = this.canvas.viewportTransform;
      if (vpt) {
        vpt[4] += deltaX;
        vpt[5] += deltaY;
        this.canvas.setViewportTransform(vpt);
      }
    }

    e.preventDefault();
    e.stopPropagation();
    this.canvas.renderAll();
  }

  // Zoom controls
  zoomIn(): void {
    const newZoom = Math.min(this.maxZoom, this.zoom * 1.2);
    this.setZoom(newZoom);
  }

  zoomOut(): void {
    const newZoom = Math.max(this.minZoom, this.zoom / 1.2);
    this.setZoom(newZoom);
  }

  private setZoom(zoom: number): void {
    const center = new Point(this.canvas.width! / 2, this.canvas.height! / 2);
    this.canvas.zoomToPoint(center, zoom);
    this.zoom = zoom;
    this.canvas.renderAll();
  }

  resetView(): void {
    // Reset zoom to 1 and pan to origin
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.zoom = 1;
    this.canvas.renderAll();
  }

  get zoomPercent(): number {
    return Math.round(this.zoom * 100);
  }

  // Fullscreen controls using Browser Fullscreen API
  toggleFullscreen(): void {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  enterFullscreen(): void {
    const elem = this.whiteboardPage?.nativeElement;
    if (!elem) return;

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
  }

  exitFullscreen(): void {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }

  // Listen for fullscreen change events (handles browser's native Escape key)
  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  @HostListener('document:msfullscreenchange')
  onFullscreenChange(): void {
    const fullscreenElement = document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement;

    this.isFullscreen = !!fullscreenElement;
    // Resize canvas after fullscreen change
    setTimeout(() => this.resizeCanvas(), 100);
  }

  private onObjectModified(): void {
    if (!this.isLoadingState) {
      this.hasUnsavedChanges = true;
      this.saveHistory();
    }
  }

  private onObjectRemoved(e: any): void {
    if (!this.isLoadingState) {
      this.hasUnsavedChanges = true;
      this.saveHistory();
    }
  }

  // CORE: Update arrows when shapes move (text moves automatically with grouped shapes)
  private onObjectMoving(e: any): void {
    const movingObj = e.target;
    if (!movingObj) return;

    const movingShapeId = (movingObj as any).shapeId;
    if (!movingShapeId) return;

    // Find all arrows connected to this shape and update them
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj.isConnector && obj.connectionData) {
        const connData: ArrowConnectionData = obj.connectionData;
        if (connData.fromShapeId === movingShapeId || connData.toShapeId === movingShapeId) {
          this.redrawConnectorArrow(obj);
        }
      }
    });
  }

  // Redraw a connector arrow based on its connection data
  private redrawConnectorArrow(arrow: any): void {
    const connData: ArrowConnectionData = arrow.connectionData;
    if (!connData) return;

    // Find connected shapes
    const fromShape = connData.fromShapeId
      ? this.findShapeById(connData.fromShapeId)
      : null;
    const toShape = connData.toShapeId
      ? this.findShapeById(connData.toShapeId)
      : null;

    if (!fromShape && !toShape) return;

    // Get anchor points
    let startPoint = { x: arrow.left || 0, y: arrow.top || 0 };
    let endPoint = { x: (arrow.left || 0) + 100, y: arrow.top || 0 };

    if (fromShape) {
      const anchors = this.getBestAnchors(fromShape, toShape);
      startPoint = this.getShapeAnchorPoint(fromShape, anchors.fromAnchor);
      connData.fromAnchor = anchors.fromAnchor as any;
    }

    if (toShape) {
      const anchors = this.getBestAnchors(fromShape, toShape);
      endPoint = this.getShapeAnchorPoint(toShape, anchors.toAnchor);
      connData.toAnchor = anchors.toAnchor as any;
    }

    // Update the arrow line
    if (arrow.type === 'group') {
      const group = arrow as Group;
      const objects = group.getObjects();
      const line = objects.find((o: any) => o.type === 'line') as Line;
      const head = objects.find((o: any) => o.type === 'triangle') as Triangle;

      if (line && head) {
        // Calculate relative positions within the group
        const groupLeft = arrow.left || 0;
        const groupTop = arrow.top || 0;

        // Remove and recreate the arrow at new position
        const arrowId = arrow.shapeId;
        const strokeColor = line.stroke || this.strokeColor;
        const strokeWidth = line.strokeWidth || this.strokeWidth;

        this.canvas.remove(arrow);

        const newArrow = this.createConnectorArrow(
          startPoint.x,
          startPoint.y,
          endPoint.x,
          endPoint.y,
          strokeColor as string,
          strokeWidth
        );

        (newArrow as any).shapeId = arrowId;
        (newArrow as any).isConnector = true;
        (newArrow as any).connectionData = connData;

        this.canvas.add(newArrow);
        this.canvas.sendObjectToBack(newArrow);
      }
    }

    this.canvas.renderAll();
  }

  private findShapeById(shapeId: string): FabricObject | null {
    return this.canvas.getObjects().find((o: any) => o.shapeId === shapeId) || null;
  }

  private getShapeAnchorPoint(shape: FabricObject, anchor: string): { x: number; y: number } {
    const bound = shape.getBoundingRect();
    const centerX = bound.left + bound.width / 2;
    const centerY = bound.top + bound.height / 2;

    switch (anchor) {
      case 'top': return { x: centerX, y: bound.top };
      case 'bottom': return { x: centerX, y: bound.top + bound.height };
      case 'left': return { x: bound.left, y: centerY };
      case 'right': return { x: bound.left + bound.width, y: centerY };
      default: return { x: centerX, y: centerY };
    }
  }

  private getBestAnchors(fromShape: FabricObject | null, toShape: FabricObject | null): { fromAnchor: string; toAnchor: string } {
    if (!fromShape || !toShape) {
      return { fromAnchor: 'right', toAnchor: 'left' };
    }

    const fromBound = fromShape.getBoundingRect();
    const toBound = toShape.getBoundingRect();

    const fromCenterX = fromBound.left + fromBound.width / 2;
    const fromCenterY = fromBound.top + fromBound.height / 2;
    const toCenterX = toBound.left + toBound.width / 2;
    const toCenterY = toBound.top + toBound.height / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0
        ? { fromAnchor: 'right', toAnchor: 'left' }
        : { fromAnchor: 'left', toAnchor: 'right' };
    } else {
      return dy > 0
        ? { fromAnchor: 'bottom', toAnchor: 'top' }
        : { fromAnchor: 'top', toAnchor: 'bottom' };
    }
  }

  private onDoubleClick(e: any): void {
    // Prefer subTarget (child inside group) if available
    const rawTarget = e.target as any;
    const subTarget = (e as any).subTargets && (e as any).subTargets[0];
    const target = subTarget || rawTarget;
    if (!target) return;

    // Double-click on IText that's inside a shape+text group
    if (target.type === 'i-text') {
      const parentGroup = (target as any).group as Group | undefined;
      if (parentGroup && (parentGroup as any).isShapeWithText) {
        this.editShapeText(parentGroup);
        return;
      }

      // Standalone text: edit directly
      (target as IText).enterEditing();
      (target as IText).selectAll();
      return;
    }

    // Double-click on group (shape with text) to edit the text
    if (target.type === 'group') {
      const group = target as Group;
      if ((group as any).isShapeWithText) {
        this.editShapeText(group);
        return;
      }
    }

    // Double-click on bare shape to add text to it
    if (this.isConnectableShape(target) && !(target as any).isConnector) {
      this.createShapeWithText(target);
      return;
    }
  }

  setTool(tool: DrawingTool): void {
    this.cancelArrowConnection();
    this.activeTool = tool;
    this.canvas.isDrawingMode = tool === 'pen';
    this.canvas.selection = tool === 'select';

    // Disable object selection and events in pan mode
    if (tool === 'pan') {
      this.canvas.selection = false;
      this.canvas.defaultCursor = 'grab';
      this.canvas.hoverCursor = 'grab';
      this.canvas.getObjects().forEach(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else {
      this.canvas.defaultCursor = 'default';
      this.canvas.hoverCursor = 'move';
      this.canvas.getObjects().forEach(obj => {
        if (!(obj as any).isConnector) {
          obj.selectable = true;
          obj.evented = true;
        }
      });
    }

    if (tool === 'eraser') {
      this.canvas.isDrawingMode = true;
      const brush = new PencilBrush(this.canvas);
      brush.color = '#f8f9fa';
      brush.width = this.strokeWidth * 4;
      this.canvas.freeDrawingBrush = brush;
    } else if (tool === 'pen') {
      this.setupPenBrush();
    } else {
      this.canvas.isDrawingMode = false;
    }

    if (tool === 'arrow') {
      this.arrowConnectMode = 'selectingFrom';
      this.snackBar.open('Click on source shape, then target shape', 'OK', { duration: 3000 });
    }
  }

  cancelArrowConnection(): void {
    if (this.pendingArrowFrom) {
      this.unhighlightShape(this.pendingArrowFrom);
    }
    this.arrowConnectMode = 'idle';
    this.pendingArrowFrom = null;
  }

  setColor(color: string): void {
    this.strokeColor = color;
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = color;
    }

    const activeObj = this.canvas.getActiveObject();
    if (activeObj) {
      if (activeObj.type === 'i-text') {
        (activeObj as IText).set('fill', color);
      } else {
        activeObj.set('stroke', color);
      }
      this.canvas.renderAll();
    }
  }

  setFillColor(color: string): void {
    this.fillColor = color;

    const activeObj = this.canvas.getActiveObject();
    if (activeObj && activeObj.type !== 'i-text' && activeObj.type !== 'line') {
      activeObj.set('fill', color === 'transparent' ? '' : color);
      this.canvas.renderAll();
    }
  }

  setStrokeWidth(width: number): void {
    this.strokeWidth = width;
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.width = width;
    }

    const activeObj = this.canvas.getActiveObject();
    if (activeObj && activeObj.type !== 'i-text') {
      activeObj.set('strokeWidth', width);
      this.canvas.renderAll();
    }
  }

  private isConnectableShape(obj: FabricObject): boolean {
    if ((obj as any).isConnector) return false;
    const type = obj.type;
    return ['rect', 'circle', 'polygon', 'group'].includes(type || '');
  }

  private onMouseDown(e: any): void {
    // Handle pan mode (pan tool, spacebar held, or middle mouse button)
    const isMiddleButton = e.e.button === 1;
    if (this.activeTool === 'pan' || this.spacebarHeld || isMiddleButton) {
      this.isPanning = true;
      this.lastPanX = e.e.clientX;
      this.lastPanY = e.e.clientY;
      this.canvas.defaultCursor = 'grabbing';
      e.e.preventDefault();
      return;
    }

    // Handle arrow connection workflow
    if (this.activeTool === 'arrow') {
      const target = e.target;

      if (this.arrowConnectMode === 'selectingFrom') {
        if (target && this.isConnectableShape(target)) {
          // First shape selected
          this.pendingArrowFrom = target;
          this.highlightShape(target);
          this.arrowConnectMode = 'selectingTo';
          this.snackBar.open('Now click on target shape', 'OK', { duration: 2000 });
        } else {
          this.snackBar.open('Click on a shape to start connection', 'Close', { duration: 2000 });
        }
        return;
      }

      if (this.arrowConnectMode === 'selectingTo') {
        if (target && this.isConnectableShape(target) && target !== this.pendingArrowFrom) {
          // Second shape selected - create the arrow
          this.createConnectedArrow(this.pendingArrowFrom!, target);
          this.unhighlightShape(this.pendingArrowFrom!);
          this.cancelArrowConnection();
          this.setTool('select');
        } else if (target === this.pendingArrowFrom) {
          this.snackBar.open('Select a different shape', 'Close', { duration: 2000 });
        } else {
          this.snackBar.open('Click on target shape', 'Close', { duration: 2000 });
        }
        return;
      }
    }

    if (['select', 'pen', 'eraser'].includes(this.activeTool)) return;

    const pointer = this.canvas.getScenePoint(e.e);

    // Handle text tool specially
    if (this.activeTool === 'text') {
      const target = e.target;

      // If clicking on existing IText, edit it
      if (target && target.type === 'i-text') {
        this.canvas.setActiveObject(target);
        (target as IText).enterEditing();
        return;
      }

      // If there's an active text being edited, exit editing first (deselect)
      const activeObj = this.canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text' && (activeObj as IText).isEditing) {
        (activeObj as IText).exitEditing();
        this.canvas.discardActiveObject();
        this.canvas.renderAll();

        // Remove empty text objects
        if (!(activeObj as IText).text || (activeObj as IText).text?.trim() === '') {
          this.canvas.remove(activeObj);
        }
        return;
      }

      // Clicking on empty area - add new text
      if (!target) {
        this.addText(pointer.x, pointer.y);
      }
      return;
    }

    // Handle sticky note tool
    if (this.activeTool === 'stickyNote') {
      if (!e.target) {
        this.addStickyNote(pointer.x, pointer.y);
      }
      return;
    }

    // For other tools, return if clicking on an object
    if (e.target) return;

    this.isDrawing = true;
    this.startX = pointer.x;
    this.startY = pointer.y;

    this.activeShape = this.createShape(0, 0);
    if (this.activeShape) {
      this.activeShape.set({ left: this.startX, top: this.startY });
      this.canvas.add(this.activeShape);
    }
  }

  private highlightShape(shape: FabricObject): void {
    (shape as any)._origStroke = shape.stroke;
    (shape as any)._origStrokeWidth = shape.strokeWidth;
    shape.set({ stroke: '#007aff', strokeWidth: 3 });
    this.canvas.renderAll();
  }

  private unhighlightShape(shape: FabricObject): void {
    if ((shape as any)._origStroke !== undefined) {
      shape.set({
        stroke: (shape as any)._origStroke,
        strokeWidth: (shape as any)._origStrokeWidth || 2
      });
      delete (shape as any)._origStroke;
      delete (shape as any)._origStrokeWidth;
      this.canvas.renderAll();
    }
  }

  private createConnectedArrow(fromShape: FabricObject, toShape: FabricObject): void {
    // Ensure both shapes have IDs
    if (!(fromShape as any).shapeId) {
      (fromShape as any).shapeId = generateShapeId();
    }
    if (!(toShape as any).shapeId) {
      (toShape as any).shapeId = generateShapeId();
    }

    const anchors = this.getBestAnchors(fromShape, toShape);
    const startPoint = this.getShapeAnchorPoint(fromShape, anchors.fromAnchor);
    const endPoint = this.getShapeAnchorPoint(toShape, anchors.toAnchor);

    const arrow = this.createConnectorArrow(
      startPoint.x, startPoint.y,
      endPoint.x, endPoint.y,
      this.strokeColor,
      this.strokeWidth
    );

    // Store connection data ON the arrow
    const connectionData: ArrowConnectionData = {
      fromShapeId: (fromShape as any).shapeId,
      toShapeId: (toShape as any).shapeId,
      fromAnchor: anchors.fromAnchor as any,
      toAnchor: anchors.toAnchor as any
    };

    (arrow as any).shapeId = generateShapeId();
    (arrow as any).isConnector = true;
    (arrow as any).connectionData = connectionData;

    this.canvas.add(arrow);
    this.canvas.sendObjectToBack(arrow);
    this.canvas.renderAll();

    this.snackBar.open('Connected! Move shapes to see arrows update.', 'OK', { duration: 2000 });
  }

  private createConnectorArrow(x1: number, y1: number, x2: number, y2: number, color: string, width: number): Group {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 12 + width * 2;

    // Shorten line so arrowhead doesn't overlap
    const lineEndX = x2 - Math.cos(angle) * headLen * 0.5;
    const lineEndY = y2 - Math.sin(angle) * headLen * 0.5;

    const line = new Line([x1, y1, lineEndX, lineEndY], {
      stroke: color,
      strokeWidth: width,
      selectable: false,
      evented: false
    });

    const head = new Triangle({
      width: headLen,
      height: headLen,
      fill: color,
      left: x2,
      top: y2,
      angle: (angle * 180 / Math.PI) + 90,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    });

    const group = new Group([line, head], {
      selectable: true,
      hasControls: false,
      hasBorders: true,
      lockMovementX: true,
      lockMovementY: true
    });

    return group;
  }

  private onMouseMove(e: any): void {
    // Handle panning (infinite canvas) - pan tool, spacebar, or middle mouse
    if (this.isPanning) {
      const deltaX = e.e.clientX - this.lastPanX;
      const deltaY = e.e.clientY - this.lastPanY;

      const vpt = this.canvas.viewportTransform;
      if (vpt) {
        vpt[4] += deltaX;
        vpt[5] += deltaY;
        this.canvas.setViewportTransform(vpt);
      }

      this.lastPanX = e.e.clientX;
      this.lastPanY = e.e.clientY;
      return;
    }

    if (!this.isDrawing || !this.activeShape) return;

    const pointer = this.canvas.getScenePoint(e.e);
    const width = pointer.x - this.startX;
    const height = pointer.y - this.startY;

    switch (this.activeTool) {
      case 'line':
        (this.activeShape as Line).set({ x2: pointer.x, y2: pointer.y });
        break;
      case 'rectangle':
      case 'roundedRect':
        this.activeShape.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width < 0 ? pointer.x : this.startX,
          top: height < 0 ? pointer.y : this.startY
        });
        break;
      case 'circle':
        const radius = Math.sqrt(width * width + height * height) / 2;
        (this.activeShape as Circle).set({ radius });
        break;
      case 'diamond':
      case 'parallelogram':
        this.updatePolygonShape(Math.abs(width), Math.abs(height), width < 0, height < 0);
        break;
    }

    this.canvas.renderAll();
  }

  private updatePolygonShape(width: number, height: number, flipX: boolean, flipY: boolean): void {
    if (!this.activeShape) return;

    let points: { x: number; y: number }[] = [];

    // Compute the visual center of the drag box so the shape stays fully visible
    const centerX = this.startX + (flipX ? -width / 2 : width / 2);
    const centerY = this.startY + (flipY ? -height / 2 : height / 2);

    if (this.activeTool === 'diamond') {
      points = [
        { x: 0, y: -height / 2 },
        { x: width / 2, y: 0 },
        { x: 0, y: height / 2 },
        { x: -width / 2, y: 0 }
      ];
    } else if (this.activeTool === 'parallelogram') {
      const skew = width * 0.2;
      points = [
        { x: -width / 2 + skew, y: -height / 2 },
        { x: width / 2 + skew, y: -height / 2 },
        { x: width / 2 - skew, y: height / 2 },
        { x: -width / 2 - skew, y: height / 2 }
      ];
    }

    // For polygons, let Fabric compute width/height from points; only update points & position.
    (this.activeShape as Polygon).set({
      points,
      left: centerX,
      top: centerY,
      originX: 'center',
      originY: 'center'
    });
    (this.activeShape as Polygon).setCoords();
  }

  private onMouseUp(e: any): void {
    // End panning
    if (this.isPanning) {
      this.isPanning = false;
      // Restore cursor based on context
      if (this.activeTool === 'pan') {
        this.canvas.defaultCursor = 'grab';
      } else if (this.spacebarHeld) {
        this.canvas.defaultCursor = 'grab';
      } else {
        this.canvas.defaultCursor = 'default';
      }
    }

    // After drawing a shape, select it and auto-switch to select tool
    if (this.isDrawing && this.activeShape && this.isShapeTool(this.activeTool)) {
      this.canvas.setActiveObject(this.activeShape);
      this.canvas.renderAll();
      // Auto change tool to selection to avoid accidentally adding more shapes
      this.setTool('select');
    }

    this.isDrawing = false;
    this.activeShape = null;
  }

  // Check if current tool is a shape tool (not line, text, etc.)
  private isShapeTool(tool: DrawingTool): boolean {
    return ['rectangle', 'roundedRect', 'diamond', 'parallelogram', 'circle'].includes(tool);
  }

  // Add text label to a shape (creates a group with shape + text)
  addTextToSelectedShape(): void {
    const activeObj = this.canvas.getActiveObject();
    if (!activeObj) {
      this.snackBar.open('Select a shape first', 'OK', { duration: 2000 });
      return;
    }

    // If it's already a group with text, edit the text
    if (activeObj.type === 'group' && (activeObj as any).isShapeWithText) {
      this.editShapeText(activeObj as Group);
      return;
    }

    // If it's a basic shape, convert to shape with text
    if (this.isConnectableShape(activeObj)) {
      this.createShapeWithText(activeObj);
    }
  }

  // Create a group with shape and centered text
  private createShapeWithText(shape: FabricObject): void {
    const shapeId = (shape as any).shapeId || generateShapeId();
    const bound = shape.getBoundingRect();
    const centerX = bound.left + bound.width / 2;
    const centerY = bound.top + bound.height / 2;

    // Remove original shape
    this.canvas.remove(shape);

    // Clone shape properties
    const shapeClone = this.cloneShapeForGroup(shape, bound);

    // Create text
    const text = new IText('Label', {
      left: 0,
      top: 0,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      fontSize: 14,
      fill: '#1d1d1f',
      originX: 'center',
      originY: 'center',
      textAlign: 'center'
    });

    // Create group
    const group = new Group([shapeClone, text], {
      left: centerX,
      top: centerY,
      originX: 'center',
      originY: 'center',
      subTargetCheck: true
    });

    (group as any).shapeId = shapeId;
    (group as any).isShapeWithText = true;

    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();

    this.snackBar.open('Double-click to edit text', 'OK', { duration: 2000 });
  }

  // Clone shape for use in group
  private cloneShapeForGroup(shape: FabricObject, bound: any): FabricObject {
    let newShape: FabricObject;

    const baseProps = {
      left: 0,
      top: 0,
      originX: 'center' as const,
      originY: 'center' as const,
      fill: shape.fill,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      strokeUniform: true
    };

    if (shape.type === 'rect') {
      const rect = shape as Rect;
      newShape = new Rect({
        ...baseProps,
        width: rect.width,
        height: rect.height,
        rx: rect.rx,
        ry: rect.ry
      });
    } else if (shape.type === 'circle') {
      const circle = shape as Circle;
      newShape = new Circle({
        ...baseProps,
        radius: circle.radius
      });
    } else if (shape.type === 'polygon') {
      const polygon = shape as Polygon;
      // Clone using existing points; let Fabric derive width/height from points
      newShape = new Polygon(polygon.points || [], {
        ...baseProps
      });
    } else {
      // Fallback - create a rect
      newShape = new Rect({
        ...baseProps,
        width: bound.width,
        height: bound.height
      });
    }

    return newShape;
  }

  // Edit text in a shape group
  private editShapeText(group: Group): void {
    const textObj = group.getObjects().find(o => o.type === 'i-text') as IText;
    if (!textObj) return;

    // Get group position
    const groupLeft = group.left || 0;
    const groupTop = group.top || 0;

    // Create a temporary text at the group position for editing
    const editText = new IText(textObj.text || '', {
      left: groupLeft,
      top: groupTop,
      fontFamily: textObj.fontFamily,
      fontSize: textObj.fontSize,
      fill: textObj.fill,
      originX: 'center',
      originY: 'center',
      textAlign: 'center'
    });

    (editText as any)._editingGroup = group;

    // Hide group, show edit text
    group.set({ opacity: 0.3 });

    this.canvas.add(editText);
    this.canvas.setActiveObject(editText);
    editText.enterEditing();
    editText.selectAll();
    this.canvas.renderAll();
  }

  // Finish editing shape text
  private finishEditingShapeText(editText: IText): void {
    const group = (editText as any)._editingGroup as Group;
    if (!group) return;

    const newTextContent = editText.text || '';

    // Update text in group
    const textInGroup = group.getObjects().find(o => o.type === 'i-text') as IText;
    if (textInGroup) {
      textInGroup.set({ text: newTextContent });
    }

    // Show group again
    group.set({ opacity: 1 });

    // Remove edit text
    this.canvas.remove(editText);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
  }

  private createShape(width: number, height: number): FabricObject | null {
    const baseOptions = {
      stroke: this.strokeColor,
      strokeWidth: this.strokeWidth,
      fill: this.fillColor === 'transparent' ? '' : this.fillColor,
      selectable: true,
      strokeUniform: true
    };

    let shape: FabricObject | null = null;

    switch (this.activeTool) {
      case 'line':
        shape = new Line([0, 0, 0, 0], { ...baseOptions, fill: '' });
        break;
      case 'rectangle':
        shape = new Rect({ ...baseOptions, width, height, rx: 0, ry: 0 });
        break;
      case 'roundedRect':
        shape = new Rect({ ...baseOptions, width, height, rx: 12, ry: 12 });
        break;
      case 'circle':
        shape = new Circle({ ...baseOptions, radius: 0 });
        break;
      case 'diamond':
        shape = new Polygon([
          { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }
        ], baseOptions);
        break;
      case 'parallelogram':
        shape = new Polygon([
          { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }
        ], baseOptions);
        break;
      default:
        return null;
    }

    if (shape) {
      (shape as any).shapeId = generateShapeId();
    }

    return shape;
  }

  private addText(x: number, y: number): void {
    const text = new IText('', {
      left: x,
      top: y,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      fontSize: this.fontSize,
      fill: this.strokeColor,
      selectable: true,
      editable: true
    });
    (text as any).shapeId = generateShapeId();
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    text.enterEditing();
  }

  private addStickyNote(x: number, y: number): void {
    const noteColors = ['#fff3cd', '#cfe2ff', '#d1e7dd', '#f8d7da', '#e2d9f3'];
    const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)];

    const rect = new Rect({
      width: 150,
      height: 100,
      fill: randomColor,
      stroke: '#00000020',
      strokeWidth: 1,
      rx: 4,
      ry: 4
    });

    const text = new IText('Note...', {
      fontSize: 14,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fill: '#1d1d1f',
      left: 10,
      top: 10,
      width: 130,
      editable: true
    });

    const group = new Group([rect, text], { left: x, top: y, selectable: true });
    (group as any).shapeId = generateShapeId();
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
  }

  addFlowchartShape(type: 'process' | 'decision' | 'terminator' | 'data'): void {
    const centerX = this.canvas.width! / 2;
    const centerY = this.canvas.height! / 2;

    const baseOptions = {
      stroke: this.strokeColor,
      strokeWidth: this.strokeWidth,
      fill: this.fillColor === 'transparent' ? '#ffffff' : this.fillColor,
      strokeUniform: true
    };

    let shape: FabricObject;

    switch (type) {
      case 'process':
        shape = new Rect({ ...baseOptions, width: 140, height: 60 });
        break;
      case 'decision':
        shape = new Polygon([
          { x: 70, y: 0 }, { x: 140, y: 40 }, { x: 70, y: 80 }, { x: 0, y: 40 }
        ], baseOptions);
        break;
      case 'terminator':
        shape = new Rect({ ...baseOptions, width: 120, height: 50, rx: 25, ry: 25 });
        break;
      case 'data':
        shape = new Polygon([
          { x: 20, y: 0 }, { x: 140, y: 0 }, { x: 120, y: 60 }, { x: 0, y: 60 }
        ], baseOptions);
        break;
      default:
        return;
    }

    (shape as any).shapeId = generateShapeId();
    shape.set({ left: centerX - 70, top: centerY - 30 });
    this.canvas.add(shape);

    const text = new IText('Label', {
      fontSize: 14,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fill: '#1d1d1f',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      left: centerX,
      top: centerY
    });
    this.canvas.add(text);
    this.canvas.renderAll();
    this.setTool('select');
  }

  openTableDialog(): void {
    this.showTableDialog = true;
  }

  closeTableDialog(): void {
    this.showTableDialog = false;
  }

  insertTable(): void {
    if (this.tableRows < 1 || this.tableCols < 1) return;

    const cellWidth = 100;
    const cellHeight = 36;
    const startX = (this.canvas.width! - this.tableCols * cellWidth) / 2;
    const startY = (this.canvas.height! - this.tableRows * cellHeight) / 2;

    const objects: FabricObject[] = [];

    for (let row = 0; row < this.tableRows; row++) {
      for (let col = 0; col < this.tableCols; col++) {
        const cell = new Rect({
          left: startX + col * cellWidth,
          top: startY + row * cellHeight,
          width: cellWidth,
          height: cellHeight,
          fill: row === 0 ? '#e9ecef' : '#ffffff',
          stroke: '#dee2e6',
          strokeWidth: 1,
          selectable: false
        });
        objects.push(cell);

        const cellText = new IText(row === 0 ? `Col ${col + 1}` : '', {
          left: startX + col * cellWidth + cellWidth / 2,
          top: startY + row * cellHeight + cellHeight / 2,
          fontSize: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          fill: '#1d1d1f',
          originX: 'center',
          originY: 'center',
          editable: true,
          selectable: true
        });
        objects.push(cellText);
      }
    }

    const table = new Group(objects, { selectable: true, subTargetCheck: true });
    (table as any).shapeId = generateShapeId();
    this.canvas.add(table);
    this.canvas.setActiveObject(table);
    this.canvas.renderAll();

    this.closeTableDialog();
    this.setTool('select');
  }

  addQuickShape(type: string): void {
    switch (type) {
      case 'process':
      case 'decision':
      case 'terminator':
      case 'data':
        this.addFlowchartShape(type as any);
        break;
      case 'table':
        this.openTableDialog();
        break;
    }
  }

  // Serialize canvas with custom properties
  private getCanvasJSON(): any {
    const json = this.canvas.toJSON();
    // Manually add custom properties to each object
    json.objects = json.objects.map((objJson: any, index: number) => {
      const fabricObj = this.canvas.getObjects()[index] as any;
      if (fabricObj) {
        CUSTOM_PROPS.forEach(prop => {
          if (fabricObj[prop] !== undefined) {
            objJson[prop] = fabricObj[prop];
          }
        });
      }
      return objJson;
    });
    return json;
  }

  /**
   * Firestore does NOT allow undefined anywhere in the payload.
   * This helper recursively removes all keys with value === undefined
   * from objects/arrays before saving.
   */
  private sanitizeForFirestore(value: any): any {
    if (Array.isArray(value)) {
      return value.map(v => this.sanitizeForFirestore(v));
    }
    if (value && typeof value === 'object') {
      const clean: any = {};
      Object.keys(value).forEach(key => {
        const v = (value as any)[key];
        if (v === undefined) return; // skip undefined
        clean[key] = this.sanitizeForFirestore(v);
      });
      return clean;
    }
    return value;
  }

  // History
  private saveHistory(): void {
    if (this.isLoadingState) return;
    const json = JSON.stringify(this.getCanvasJSON());
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(json);
    this.historyIndex = this.history.length - 1;
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.loadHistoryState(this.history[this.historyIndex]);
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.loadHistoryState(this.history[this.historyIndex]);
    }
  }

  private loadHistoryState(json: string): void {
    this.isLoadingState = true;
    this.canvas.loadFromJSON(json).then(() => {
      this.restoreCustomProperties();
      this.canvas.renderAll();
      this.isLoadingState = false;
      this.hasUnsavedChanges = true;
    });
  }

  // Restore custom properties after loading JSON
  private restoreCustomProperties(): void {
    // Custom properties are now saved in the JSON, they should be automatically restored
    // But fabric.js may not restore them to the object instance, so we manually set them
    // This is handled by fabric.js when the JSON contains the properties
  }

  get canUndo(): boolean {
    return this.historyIndex > 0;
  }

  get canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  deleteSelected(): void {
    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => this.canvas.remove(obj));
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
    }
  }

  duplicateSelected(): void {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    active.clone().then((cloned: FabricObject) => {
      (cloned as any).shapeId = generateShapeId();
      // Don't copy connection data for connectors
      delete (cloned as any).connectionData;
      delete (cloned as any).isConnector;
      cloned.set({ left: (active.left || 0) + 20, top: (active.top || 0) + 20 });
      this.canvas.add(cloned);
      this.canvas.setActiveObject(cloned);
      this.canvas.renderAll();
    });
  }

  bringForward(): void {
    const active = this.canvas.getActiveObject();
    if (active) {
      this.canvas.bringObjectForward(active);
      this.canvas.renderAll();
    }
  }

  sendBackward(): void {
    const active = this.canvas.getActiveObject();
    if (active) {
      this.canvas.sendObjectBackwards(active);
      this.canvas.renderAll();
    }
  }

  clearCanvas(): void {
    if (!confirm('Clear the entire canvas?')) return;
    this.canvas.clear();
    this.canvas.backgroundColor = '#f8f9fa';
    this.canvas.renderAll();
    this.hasUnsavedChanges = true;
  }

  exportAsImage(): void {
    const dataURL = this.canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    const link = document.createElement('a');
    link.download = 'flowchart.png';
    link.href = dataURL;
    link.click();
    this.snackBar.open('Image exported', 'Close', { duration: 2000 });
  }

  loadWhiteboard(): void {
    if (!this.projectId) return;
    this.isLoading = true;
    this.whiteboardSub = this.afs
      .collection(OWN_PROJECTS_COLLECTION)
      .doc(this.projectId)
      .collection('whiteboard')
      .doc(WHITEBOARD_DOC_ID)
      .valueChanges()
      .subscribe({
        next: (data: any) => {
          if (data?.canvasJson) {
            this.isLoadingState = true;
            this.canvas.loadFromJSON(data.canvasJson).then(() => {
              this.restoreCustomProperties();
              this.canvas.renderAll();
              this.isLoadingState = false;
              this.saveHistory();
            });
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error loading whiteboard', 'Close', { duration: 3000 });
        }
      });
  }

  saveWhiteboard(): void {
    if (!this.projectId) return;
    this.isSaving = true;
    const payload = {
      canvasJson: this.sanitizeForFirestore(this.getCanvasJSON()),
      updatedAt: new Date(),
      updatedBy: localStorage.getItem('userid') || '',
      updatedByName: localStorage.getItem('username') || 'Unknown'
    };
    console.log('payload :', payload);
    this.afs
      .collection(OWN_PROJECTS_COLLECTION)
      .doc(this.projectId)
      .collection('whiteboard')
      .doc(WHITEBOARD_DOC_ID)
      .set(payload, { merge: true })
      .then(() => {
        this.snackBar.open('Saved', 'Close', { duration: 2000 });
        this.isSaving = false;
        this.hasUnsavedChanges = false;
      })
      .catch(() => {
        this.snackBar.open('Save failed', 'Close', { duration: 3000 });
        this.isSaving = false;
      });
  }
}
