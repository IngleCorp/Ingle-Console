import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { GeneralService } from '../../../../../../core/services/general.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-project-board',
  templateUrl: './project-board.component.html',
  styleUrls: ['./project-board.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('expanded', style({
        opacity: 1,
        transform: 'translateY(0)',
        height: '*'
      })),
      state('collapsed', style({
        opacity: 0,
        transform: 'translateY(-10px)',
        height: '0'
      })),
      transition('expanded <=> collapsed', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class ProjectBoardComponent implements OnInit {
  activetab: any;
  projectId: string | null = null;
  clientId: string | null = null;
  pathname: any;
  projectInfo: any = null;
  isHeaderCollapsed: boolean = true;

  constructor(private service: GeneralService, private route: ActivatedRoute, private afs: AngularFirestore) { }

  ngOnInit(): void {
    this.activetab = localStorage.getItem('pactivetab');
    const url = this.route.snapshot.url;
    this.clientId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? null;
    this.getProjectinfo();
  }

  toggleHeader(): void {
    this.isHeaderCollapsed = !this.isHeaderCollapsed;
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
      this.projectInfo = res;
      this.service.openSnackBar('Client > ' + res.clientname + ' > Project > ' + res.name, 'Close');
    }, (err: any) => {
      console.log(err);
    });
  }

  getProjectStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'completed';
      case 'pending':
        return 'pending';
      case 'active':
      default:
        return 'active';
    }
  }

  getProjectIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'check_circle';
      case 'pending':
        return 'schedule';
      case 'active':
      default:
        return 'play_circle';
    }
  }

  editProject(): void {
    // TODO: Implement edit project functionality
    console.log('Edit project:', this.projectId);
  }
}
