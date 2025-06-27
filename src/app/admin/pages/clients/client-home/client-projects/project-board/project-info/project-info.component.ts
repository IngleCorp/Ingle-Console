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
  showaction: any = '';
  user: any = null;
  add: boolean = false;
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
    this.projectId = this.route.parent?.snapshot.paramMap.get('pid') ?? null;
    this.getInfos();
  }

  onNameChange(): void {
    this.nameEvent.emit(this.pathname);
  }

  addInfo(): void {
    if (this.label && this.type && this.value && this.projectId) {
      this.afs.collection('projects').doc(this.projectId).collection('info').add({
        label: this.label,
        type: this.type,
        value: this.value,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdby: localStorage.getItem('username')
      }).then(() => {
        this.label = '';
        this.type = '';
        this.value = '';
      });
    } else {
      alert('Please fill all the fields');
    }
  }

  getInfos(): void {
    if (!this.projectId) return;
    this.afs.collection('projects').doc(this.projectId).collection('info').valueChanges({ idField: 'id' }).subscribe((res: any) => {
      this.infodata = res;
      // if (this.source) this.source.load(res); // Uncomment if ng2-smart-table is available
    });
  }

  removeinfo(event: any): void {
    const id = event.data?.id;
    if (!this.projectId || !id) return;
    this.afs.collection('projects').doc(this.projectId).collection('info').doc(id).delete();
  }
}
