import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

export interface InsertTableResult {
  rows: number;
  cols: number;
}

@Component({
  selector: 'app-insert-table-dialog',
  templateUrl: './insert-table-dialog.component.html',
  styleUrls: ['./insert-table-dialog.component.scss']
})
export class InsertTableDialogComponent {
  rows = 3;
  cols = 3;
  readonly maxRows = 20;
  readonly maxCols = 12;

  constructor(public dialogRef: MatDialogRef<InsertTableDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onInsert(): void {
    const rows = Math.max(1, Math.min(this.maxRows, this.rows));
    const cols = Math.max(1, Math.min(this.maxCols, this.cols));
    this.dialogRef.close({ rows, cols } as InsertTableResult);
  }
}
