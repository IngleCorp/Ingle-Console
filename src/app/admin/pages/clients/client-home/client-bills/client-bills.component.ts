import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
// import { InvoiceService } from '...'; // Uncomment or update if available

@Component({
  selector: 'app-client-bills',
  templateUrl: './client-bills.component.html',
  styleUrls: ['./client-bills.component.scss']
})
export class ClientBillsComponent implements OnInit {
  clientId: string | null = null;
  bills: any;
  // constructor(private afs: AngularFirestore, private route: ActivatedRoute, private invs: InvoiceService) { }
  constructor(private afs: AngularFirestore, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.clientId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
    this.getallBills();
  }

  getallBills(): void {
    if (!this.clientId) return;
    this.afs.collection('bills', ref => ref.where('clientid', '==', this.clientId)).valueChanges({ idField: 'id' }).subscribe(data => {
      this.bills = data;
      this.soertByDate();
    });
  }

  soertByDate(): void {
    this.bills = this.bills.sort((a: any, b: any) => {
      return b.createdAt - a.createdAt;
    });
  }

  createInvoice(bill: any, action: string): void {
    // Uncomment and update InvoiceService usage if available
    // this.invs.creteInvoice(bill, action);
  }
}
