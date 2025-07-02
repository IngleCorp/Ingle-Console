import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GeneralService } from '../../../../core/services/general.service';
import { ClientAddComponent } from '../client-add/client-add.component';
// Placeholder for AddComponent (to be implemented)
// import { AddComponent } from '../client-add/client-add.component';
// You may need to create or update ConfirmBoxComponent import
// import { ConfirmBoxComponent } from '...';

@Component({
  selector: 'app-clients-list',
  templateUrl: './clients-list.component.html',
  styleUrls: ['./clients-list.component.scss']
})
export class ClientsListComponent implements OnInit {
  clientList: any;
  constructor(
    private afs: AngularFirestore, 
    private dialog: MatDialog, 
    private service: GeneralService, 
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.getClients();
  }

  addClient(): void {
    const dialogRef = this.dialog.open(ClientAddComponent, {
      width: '600px',
      disableClose: true
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.getClients(); // Refresh the list if a client was added
      }
    });
  }

  getClients(): void {
    this.afs.collection('clients').valueChanges({ idField: 'id' }).subscribe((res: any) => {
      this.clientList = res;
      console.log('client list:', this.clientList);
    }, (err: any) => {
      console.log(err);
    });
  }

  gohome(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  deleteClient(id: string): void {
    // TODO: Implement delete confirmation and logic
  }

  gotoClientHome(id: string): void {
    this.router.navigate([id, 'projects'], { relativeTo: this.route });
  }
}
