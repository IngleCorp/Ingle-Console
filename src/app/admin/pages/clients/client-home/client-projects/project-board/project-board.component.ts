import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { GeneralService } from '../../../../../../core/services/general.service';

@Component({
  selector: 'app-project-board',
  templateUrl: './project-board.component.html',
  styleUrls: ['./project-board.component.scss']
})
export class ProjectBoardComponent implements OnInit {
  activetab: any;
  projectId: string | null = null;
  clientId: string | null = null;
  pathname: any;

  constructor(private service: GeneralService, private route: ActivatedRoute, private afs: AngularFirestore) { }

  ngOnInit(): void {
    this.activetab = localStorage.getItem('pactivetab');
    const url = this.route.snapshot.url;
    this.clientId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
    this.projectId = this.route.snapshot.paramMap.get('pid') ?? null;
    this.getProjectinfo();
  }

  nameEventHander($event: any): void {
    this.pathname = $event;
  }

  goBack(): void {
    window.history.back();
  }

  getProjectinfo(): void {
    if (!this.projectId) return;
    this.afs.collection('projects').doc(this.projectId).valueChanges({ idField: 'id' }).subscribe((res: any) => {
      this.service.openSnackBar('Client > ' + res.clientname + ' > Project > ' + res.name, 'Close');
    }, (err: any) => {
      console.log(err);
    });
  }
}
