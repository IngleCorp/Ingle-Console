import { Component, OnInit, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-timetaken',
  templateUrl: './timetaken.component.html',
  styleUrls: ['./timetaken.component.scss']
})
export class TimetakenComponent implements OnInit {
  time: number = 0;
  worksheetCollections: any;
  sheet: string = '';
  constructor(
    private ref: MatDialogRef<TimetakenComponent>,
    private afs: AngularFirestore,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    if (this.data.task?.projecttaged) {
      this.getWorksheets();
    } else {
      this.sheet = 'worksheet';
    }
  }

  close(sts: boolean): void {
    this.ref.close({ sts: sts, time: this.time, worksheet: this.sheet });
  }

  getWorksheets(): void {
    this.afs.collection('projects').doc(this.data.task?.projecttaged).collection('worksheets').valueChanges({ idField: 'id' }).subscribe((res: any) => {
      if (res?.length > 0) {
        this.worksheetCollections = res.filter((item: any) => {
          return item.isDeleted == false;
        });
      }
      this.sheet = this.worksheetCollections?.[0]?.name || 'worksheet';
    });
  }
}
