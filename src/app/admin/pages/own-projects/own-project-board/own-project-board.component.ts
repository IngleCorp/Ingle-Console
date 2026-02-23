import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

const OWN_PROJECTS_COLLECTION = 'ownProjects';

@Component({
  selector: 'app-own-project-board',
  templateUrl: './own-project-board.component.html',
  styleUrls: ['./own-project-board.component.scss']
})
export class OwnProjectBoardComponent implements OnInit, OnDestroy {
  projectId: string | null = null;
  projectInfo: any = null;
  isHeaderCollapsed = true;
  private projectSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private afs: AngularFirestore
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const nextId = params.get('projectId');
      if (nextId === this.projectId) return;
      this.projectId = nextId;
      this.projectInfo = null; // clear so UI doesn't show previous project
      this.projectSub?.unsubscribe();
      if (this.projectId) this.loadProject();
    });
  }

  ngOnDestroy(): void {
    this.projectSub?.unsubscribe();
  }

  loadProject(): void {
    if (!this.projectId) return;
    this.projectSub = this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId)
      .valueChanges()
      .subscribe((res: any) => {
        this.projectInfo = res;
      });
  }

  toggleHeader(): void {
    this.isHeaderCollapsed = !this.isHeaderCollapsed;
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': return 'completed';
      case 'pending': return 'pending';
      case 'on-hold': return 'on-hold';
      default: return 'active';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': return 'check_circle';
      case 'pending': return 'schedule';
      case 'on-hold': return 'pause_circle';
      default: return 'play_circle';
    }
  }
}
