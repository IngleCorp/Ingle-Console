import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
// import { NgxSpinnerService } from 'ngx-spinner'; // Uncomment if available
import { GeneralService } from '../../../../core/services/general.service';
// import { ConfirmBoxComponent } from '...'; // Uncomment or update if available

@Component({
  selector: 'app-client-add',
  templateUrl: './client-add.component.html',
  styleUrls: ['./client-add.component.scss']
})
export class ClientAddComponent implements OnInit {
  clientForm: FormGroup;
  constructor(
    public dialogRef: MatDialogRef<ClientAddComponent>,
    private fb: FormBuilder,
    private afs: AngularFirestore,
    private service: GeneralService,
    // private spinner: NgxSpinnerService,
    private dialog: MatDialog
  ) {
    this.clientForm = this.fb.group({
      name: ['', Validators.required],
      email: [''],
      phone: [''],
      address: [''],
      city: [''],
      state: [''],
      zip: [''],
      country: [''],
      notes: [''],
      image: [null],
      createdAt: [new Date()],
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    // Placeholder for form submit logic
  }

  close(): void {
    this.dialogRef.close();
  }

  addClient(): void {
    if (this.clientForm.invalid) {
      // Uncomment and update ConfirmBoxComponent usage if available
      // const dialogRef = this.dialog.open(ConfirmBoxComponent, {
      //   width: '400px',
      //   data: {
      //     message: 'Please fill all the required fields',
      //     btnOkText: 'Ok',
      //     type: 'true',
      //     cancel: false
      //   },
      // });
      // dialogRef.afterClosed().subscribe(result => {
      //   if (result) {
      //     return;
      //   }
      // });
      return;
    }
    this.afs.collection('clients').add(this.clientForm.value).then(() => {
      this.dialogRef.close();
    });
  }

  uploadFile(event: any): void {
    // Uncomment spinner usage if available
    // this.spinner.show();
    const file = event.target.files[0];
    // this.service.uploadFile(event, 'test').then((res: any) => {
    //   this.clientForm.patchValue({ image: res.url });
    //   this.spinner.hide();
    // }).catch((err: any) => {
    //   this.spinner.hide();
    // });
  }
}
