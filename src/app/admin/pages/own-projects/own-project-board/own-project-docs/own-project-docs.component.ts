import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

const OWN_PROJECTS_COLLECTION = 'ownProjects';
const DOCS_SUBCOLLECTION = 'docs';

@Component({
  selector: 'app-own-project-docs',
  templateUrl: './own-project-docs.component.html',
  styleUrls: ['./own-project-docs.component.scss']
})
export class OwnProjectDocsComponent implements OnInit {
  projectId: string | null = null;
  docs: { id: string; name: string; updatedAt?: any; createdAt?: any }[] = [];
  isLoading = false;

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    if (this.projectId) this.loadDocs();
  }

  loadDocs(): void {
    if (!this.projectId) return;
    this.isLoading = true;
    this.afs
      .collection(OWN_PROJECTS_COLLECTION)
      .doc(this.projectId)
      .collection(DOCS_SUBCOLLECTION, (ref) => ref.orderBy('updatedAt', 'desc'))
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          this.docs = (data || []).map((d: any) => ({
            id: d.id,
            name: d.name || 'Untitled',
            updatedAt: d.updatedAt,
            createdAt: d.createdAt
          }));
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error loading docs', 'Close', { duration: 3000 });
        }
      });
  }

  createDoc(): void {
    if (!this.projectId) return;
    this.router.navigate(['docs', 'new'], { relativeTo: this.route.parent });
  }

  openDoc(docId: string): void {
    this.router.navigate(['docs', docId], { relativeTo: this.route.parent });
  }

  deleteDoc(docId: string, docName: string, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Delete "${docName}"?`)) return;
    if (!this.projectId) return;
    this.afs
      .collection(OWN_PROJECTS_COLLECTION)
      .doc(this.projectId)
      .collection(DOCS_SUBCOLLECTION)
      .doc(docId)
      .delete()
      .then(() => this.snackBar.open('Doc deleted', 'Close', { duration: 2000 }))
      .catch(() => this.snackBar.open('Failed to delete', 'Close', { duration: 3000 }));
  }

  getEditedAgo(updatedAt: any): string {
    if (!updatedAt) return 'Never edited';
    const t = updatedAt?.toDate ? updatedAt.toDate() : new Date(updatedAt);
    const now = new Date();
    const ms = now.getTime() - t.getTime();
    const min = Math.floor(ms / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `Edited ${day}d ago`;
    if (hr > 0) return `Edited ${hr}h ago`;
    if (min > 0) return `Edited ${min}m ago`;
    return 'Edited just now';
  }
}
