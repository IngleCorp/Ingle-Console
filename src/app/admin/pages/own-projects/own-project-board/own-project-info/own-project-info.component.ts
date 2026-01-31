import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

const OWN_PROJECTS_COLLECTION = 'ownProjects';

@Component({
  selector: 'app-own-project-info',
  templateUrl: './own-project-info.component.html',
  styleUrls: ['./own-project-info.component.scss']
})
export class OwnProjectInfoComponent implements OnInit {
  projectId: string | null = null;
  infodata: any[] = [];
  filteredInfodata: any[] = [];
  selectedTypeFilter = '';
  add = false;
  editMode = false;
  editInfoId: string | null = null;
  loading = false;
  feedback: { type: 'success' | 'error' | ''; message: string } = { type: '', message: '' };
  label = '';
  type = '';
  value = '';

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    if (this.projectId) this.getInfos();
  }

  getInfos(): void {
    if (!this.projectId) return;
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('info')
      .valueChanges({ idField: 'id' })
      .subscribe((res: any) => {
        this.infodata = res || [];
        this.filteredInfodata = [...this.infodata];
      });
  }

  toggleAddForm(): void {
    this.add = !this.add;
    if (!this.add) this.resetForm();
  }

  addInfo(): void {
    if (!this.label?.trim() || !this.type || !this.value?.trim() || !this.projectId) {
      this.showFeedback('error', 'Fill all fields');
      return;
    }
    this.loading = true;
    const payload = {
      label: this.label.trim(),
      type: this.type,
      value: this.value.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdby: localStorage.getItem('username') || 'Unknown'
    };
    if (this.editMode && this.editInfoId) {
      this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).collection('info').doc(this.editInfoId)
        .update({ label: payload.label, type: payload.type, value: payload.value, updatedAt: new Date() })
        .then(() => {
          this.showFeedback('success', 'Updated');
          this.resetForm();
          this.add = false;
          this.editMode = false;
          this.editInfoId = null;
          this.getInfos();
        })
        .catch(() => this.showFeedback('error', 'Update failed'))
        .finally(() => { this.loading = false; });
    } else {
      this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId!).collection('info').add(payload)
        .then(() => {
          this.showFeedback('success', 'Added');
          this.resetForm();
          this.add = false;
          this.getInfos();
        })
        .catch(() => this.showFeedback('error', 'Add failed'))
        .finally(() => { this.loading = false; });
    }
  }

  cancelAdd(): void {
    this.add = false;
    this.editMode = false;
    this.editInfoId = null;
    this.resetForm();
  }

  resetForm(): void {
    this.label = '';
    this.type = '';
    this.value = '';
  }

  filterByType(): void {
    if (!this.selectedTypeFilter) {
      this.filteredInfodata = [...this.infodata];
    } else {
      this.filteredInfodata = this.infodata.filter(i => i.type === this.selectedTypeFilter);
    }
  }

  editInfo(info: any): void {
    this.label = info.label;
    this.type = info.type;
    this.value = info.value;
    this.editInfoId = info.id;
    this.editMode = true;
    this.add = true;
  }

  deleteInfo(id: string): void {
    if (!confirm('Delete this item?')) return;
    if (!this.projectId || !id) return;
    this.afs.collection(OWN_PROJECTS_COLLECTION).doc(this.projectId).collection('info').doc(id).delete()
      .then(() => {
        this.showFeedback('success', 'Deleted');
        this.getInfos();
      })
      .catch(() => this.showFeedback('error', 'Delete failed'));
  }

  getTypeIcon(t: string): string {
    const map: Record<string, string> = { link: 'link', email: 'email', phone: 'phone', date: 'event' };
    return map[t] || 'text_fields';
  }

  getInputType(): string {
    const map: Record<string, string> = { date: 'date', email: 'email', phone: 'tel' };
    return map[this.type] || 'text';
  }

  getValuePlaceholder(): string {
    const map: Record<string, string> = {
      link: 'https://example.com',
      email: 'user@example.com',
      phone: '+1 555 123 4567',
      date: 'Select date'
    };
    return map[this.type] || 'Enter value';
  }

  getValueIcon(): string {
    return this.getTypeIcon(this.type);
  }

  getCreatedDisplay(createdAt: any): string {
    if (!createdAt?.seconds) return 'N/A';
    return new Date(createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  trackByInfo(_: number, info: any): string {
    return info.id;
  }

  private showFeedback(type: 'success' | 'error' | '', message: string): void {
    this.feedback = { type, message };
    this.snackBar.open(message, 'Close', { duration: 3000 });
    setTimeout(() => { this.feedback = { type: '', message: '' }; }, 3000);
  }
}
