import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';

@Component({
  selector: 'app-worksheet-entry-form',
  templateUrl: './worksheet-entry-form.component.html',
  styleUrls: ['./worksheet-entry-form.component.scss']
})
export class WorksheetEntryFormComponent implements OnInit {
  entryForm: FormGroup;
  users: any[] = [];
  statusOptions = [
    { value: 'Progress', title: 'Progress' },
    { value: 'Completed', title: 'Completed' },
    { value: 'Pending', title: 'Pending' },
    { value: 'Hold', title: 'Hold' }
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<WorksheetEntryFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.users = data.users || [];
    this.entryForm = this.fb.group({
      date: [new Date(), Validators.required],
      task: ['', Validators.required],
      doneby: ['', Validators.required],
      status: ['Progress', Validators.required],
      time: ['', [Validators.required, Validators.min(1)]],
      remarks: ['']
    });
  }

  ngOnInit(): void {
    // If editing existing entry, populate form
    if (this.data.entry) {
      const entry = this.data.entry;
      this.entryForm.patchValue({
        date: entry.createdAt?.seconds ? new Date(entry.createdAt.seconds * 1000) : new Date(),
        task: entry.task || '',
        doneby: entry.doneby || '',
        status: entry.status || 'Progress',
        time: entry.time || '',
        remarks: entry.remarks || ''
      });
    }
  }

  onSubmit(): void {
    if (this.entryForm.valid) {
      const formValue = this.entryForm.value;
      const entryData = {
        ...formValue,
        createdAt: formValue.date // Use the selected date
      };
      this.dialogRef.close(entryData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onDateChange(event: MatDatepickerInputEvent<Date>): void {
    if (event.value) {
      this.entryForm.patchValue({ date: event.value });
    }
  }
} 