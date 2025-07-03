import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
// import { LocalDataSource } from 'ng2-smart-table'; // Uncomment if ng2-smart-table is available

@Component({
  selector: 'app-project-info',
  templateUrl: './project-info.component.html',
  styleUrls: ['./project-info.component.scss']
})
export class ProjectInfoComponent implements OnInit {
  @Output() nameEvent = new EventEmitter<string>();
  projectId: string | null = null;
  infodata: any;
  filteredInfodata: any;
  selectedTypeFilter: string = '';
  showaction: any = '';
  user: any = null;
  add: boolean = false;
  editMode: boolean = false;
  editInfoId: string | null = null;
  loading: boolean = false;
  feedback: { type: 'success' | 'error' | '', message: string } = { type: '', message: '' };
  pathname: any;
  // source: LocalDataSource = new LocalDataSource(); // Uncomment if ng2-smart-table is available
  label: string = '';
  type: string = '';
  value: string = '';

  settings = {
    mode: 'Inline',
    actions: {
      add: true,
      edit: true,
      delete: true,
      position: 'right'
    },
    add: {
      addButtonContent: '<i class="fa fa-plus" aria-hidden="true"></i>',
      createButtonContent: '<i class="fa fa-check" aria-hidden="true"></i>',
      cancelButtonContent: '<i class="fa fa-times" aria-hidden="true"></i>',
    },
    edit: {
      editButtonContent: '<i class="fa fa-pencil" aria-hidden="true"></i>',
      saveButtonContent: '<i class="fa fa-check" aria-hidden="true"></i>',
      cancelButtonContent: '<i class="fa fa-times" aria-hidden="true"></i>',
    },
    delete: {
      deleteButtonContent: '<i class="fa fa-trash" aria-hidden="true"></i>',
      saveButtonContent: '<i class="fa fa-check" aria-hidden="true"></i>',
      cancelButtonContent: '<i class="fa fa-times" aria-hidden="true"></i>',
    },
    columns: {
      index: {
        title: '#',
        type: 'number',
        valuePrepareFunction: (value: any, row: any, cell: any) => {
          return cell.row.index + 1;
        }
      },
      label: {
        type: 'text',
        title: 'Label'
      },
      type: {
        type: 'text',
        title: 'Type'
      },
      value: {
        type: 'html',
        title: 'Type',
        valuePrepareFunction: (value: any, row: any, cell: any) => {
          if (row.type == 'link') {
            return '<a href="' + value + '" target="_blank">' + value + '</a>';
          } else {
            return value;
          }
        }
      },
      createdAt: {
        type: 'text',
        title: 'Created At',
        valuePrepareFunction: (value: any, row: any, cell: any) => {
          if (row.createdAt) {
            return new Date(row.createdAt?.seconds * 1000).toLocaleString();
          } else {
            return '';
          }
        }
      },
    }
  };

  constructor(private afs: AngularFirestore, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    localStorage.setItem('pactivetab', 'info');
    const url = this.route.snapshot.url;
    this.pathname = url[0]?.path;
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    console.log('Project ID:', this.projectId);
    this.getInfos();
  }

  onNameChange(): void {
    this.nameEvent.emit(this.pathname);
  }

  addInfo(): void {
    if (!this.label || !this.type || !this.value || !this.projectId) {
      this.showFeedback('error', 'Please fill all the fields');
      return;
    }
    this.loading = true;
    if (this.editMode && this.editInfoId) {
      // Edit existing info
      this.afs.collection('projects').doc(this.projectId).collection('info').doc(this.editInfoId).update({
        label: this.label,
        type: this.type,
        value: this.value,
        updatedAt: new Date(),
      }).then(() => {
        this.showFeedback('success', 'Information updated successfully');
        this.resetForm();
        this.add = false;
        this.editMode = false;
        this.editInfoId = null;
      }).catch(() => {
        this.showFeedback('error', 'Failed to update information');
      }).finally(() => {
        this.loading = false;
      });
    } else {
      // Add new info
      this.afs.collection('projects').doc(this.projectId).collection('info').add({
        label: this.label,
        type: this.type,
        value: this.value,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdby: localStorage.getItem('username')
      }).then(() => {
        this.showFeedback('success', 'Information added successfully');
        this.resetForm();
        this.add = false;
      }).catch(() => {
        this.showFeedback('error', 'Failed to add information');
      }).finally(() => {
        this.loading = false;
      });
    }
  }

  getInfos(): void {
    console.log('Fetching info for project ID:', this.projectId);

    if (!this.projectId) return;
    this.afs.collection('projects').doc(this.projectId).collection('info').valueChanges({ idField: 'id' }).subscribe((res: any) => {
      this.infodata = res;
      this.filteredInfodata = res;
      console.log('Info data:', this.infodata);
      // if (this.source) this.source.load(res); // Uncomment if ng2-smart-table is available
    });
  }

  filterByType(): void {
    if (!this.selectedTypeFilter) {
      this.filteredInfodata = this.infodata;
    } else {
      this.filteredInfodata = this.infodata?.filter((info: any) => info.type === this.selectedTypeFilter) || [];
    }
  }

  removeinfo(event: any): void {
    const id = event.data?.id;
    if (!this.projectId || !id) return;
    this.afs.collection('projects').doc(this.projectId).collection('info').doc(id).delete();
  }

  // New methods for the redesigned component
  toggleAddForm(): void {
    this.add = !this.add;
    if (!this.add) {
      this.resetForm();
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

  getValueIcon(): string {
    switch (this.type) {
      case 'link': return 'link';
      case 'email': return 'email';
      case 'phone': return 'phone';
      case 'date': return 'event';
      default: return 'text_fields';
    }
  }

  getInputType(): string {
    switch (this.type) {
      case 'date': return 'date';
      case 'email': return 'email';
      case 'phone': return 'tel';
      default: return 'text';
    }
  }

  getValuePlaceholder(): string {
    switch (this.type) {
      case 'link': return 'https://example.com';
      case 'email': return 'user@example.com';
      case 'phone': return '+1 (555) 123-4567';
      case 'date': return 'Select date';
      default: return 'Enter value';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'link': return 'link';
      case 'email': return 'email';
      case 'phone': return 'phone';
      case 'date': return 'event';
      default: return 'text_fields';
    }
  }

  trackByInfo(index: number, info: any): string {
    return info.id || index;
  }

  editInfo(info: any): void {
    this.label = info.label;
    this.type = info.type;
    this.value = info.value;
    this.add = true;
    this.editMode = true;
    this.editInfoId = info.id;
  }

  deleteInfo(id: string): void {
    if (confirm('Are you sure you want to delete this information?')) {
      if (!this.projectId || !id) return;
      this.loading = true;
      this.afs.collection('projects').doc(this.projectId).collection('info').doc(id).delete()
        .then(() => {
          this.showFeedback('success', 'Information deleted successfully');
        })
        .catch(() => {
          this.showFeedback('error', 'Failed to delete information');
        })
        .finally(() => {
          this.loading = false;
        });
    }
  }

  getCreatedDateTooltip(createdAt: any): string {
    if (!createdAt?.seconds) {
      return 'Date not available';
    }
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleString();
  }

  getCreatedDateDisplay(createdAt: any): string {
    if (!createdAt?.seconds) {
      return 'N/A';
    }
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  showFeedback(type: 'success' | 'error' | '', message: string) {
    this.feedback = { type, message };
    setTimeout(() => { this.feedback = { type: '', message: '' }; }, 3000);
  }
}
