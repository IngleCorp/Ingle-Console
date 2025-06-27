import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneralService } from '../../../../core/services/general.service';

@Component({
  selector: 'app-client-home',
  templateUrl: './client-home.component.html',
  styleUrls: ['./client-home.component.scss']
})
export class ClientHomeComponent implements OnInit {
  // Client data properties
  activetab: string = 'projects';
  clientId: string | null = null;
  clientInfo: any = {};
  clientProjects: any[] = [];
  clientBills: any[] = [];

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private service: GeneralService
  ) { }

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    this.getClientInfo();
    this.getClientProjects();
    this.getClientBills();
  }

  getClientInfo(): void {
    if (!this.clientId) return;
    this.afs.collection('clients').doc(this.clientId).valueChanges().subscribe((res: any) => {
      this.clientInfo = res || {};
      console.log('client info:', this.clientInfo);
    }, (err: any) => {
      console.log(err);
    });
  }

  getClientProjects(): void {
    if (!this.clientId) return;
    this.afs.collection('projects', ref => ref.where('clientid', '==', this.clientId))
      .valueChanges({ idField: 'id' })
      .subscribe((res: any) => {
        this.clientProjects = res || [];
        console.log('client projects:', this.clientProjects);
      }, (err: any) => {
        console.log(err);
      });
  }

  getClientBills(): void {
    if (!this.clientId) return;
    this.afs.collection('bills', ref => ref.where('clientid', '==', this.clientId))
      .valueChanges({ idField: 'id' })
      .subscribe((res: any) => {
        this.clientBills = res || [];
        console.log('client bills:', this.clientBills);
      }, (err: any) => {
        console.log(err);
      });
  }

  editClient(): void {
    // TODO: Implement edit client functionality
    console.log('Edit client clicked');
  }

  // Helper methods for template
  getProjectsCount(): number {
    return this.clientProjects.length;
  }

  getBillsCount(): number {
    return this.clientBills.length;
  }

  getActiveProjectsCount(): number {
    return this.clientProjects.filter(p => p.status === 'active' || !p.status).length;
  }

  getCompletedProjectsCount(): number {
    return this.clientProjects.filter(p => p.status === 'completed').length;
  }

  getTotalRevenue(): number {
    return this.clientBills.reduce((total, bill) => total + (bill.amount || 0), 0);
  }

  gohome(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  backToClients(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
