import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-open-document',
  templateUrl: './open-document.component.html',
  styleUrls: ['./open-document.component.scss']
})
export class OpenDocumentComponent implements OnInit {
  projectId: string = '';
  documentId: string = '';
  document: any = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private afs: AngularFirestore
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') || '';
    this.documentId = this.route.snapshot.paramMap.get('docId') || '';
    this.loadDocument();
  }

  loadDocument(): void {
    this.afs.collection('projects').doc(this.projectId).collection('library').doc(this.documentId)
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (doc: any) => {
          this.document = doc;
          this.isLoading = false;
        },
        error: (err: any) => {
          this.isLoading = false;
        }
      });
  }

  back(): void {
    // Navigate back to the library page
    // Get the current URL and remove the last segment (document/:docId)
    const currentUrl = this.router.url;
    const libraryUrl = currentUrl.replace(/\/document\/[^\/]+$/, '');
    this.router.navigate([libraryUrl]);
  }
} 