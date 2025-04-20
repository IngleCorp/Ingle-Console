import { Component, OnInit } from '@angular/core';
import {Settings} from "angular2-smart-table";
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-types',
  templateUrl: './types.component.html',
  styleUrl: './types.component.scss'
})
export class TypesComponent  implements OnInit {
  constructor(private firestore: AngularFirestore, private router: Router) { }
  settings: Settings = {
    mode: 'external',
    actions: {
      
      add: true,
      edit: true,
      delete: true,

      position: 'right'
    },
    add: {
      addButtonContent: '<i class="material-icons">add</i>',
      createButtonContent: '<i class="material-icons">checkmark</i>',
      cancelButtonContent: '<i class="material-icons">close</i>',
      confirmCreate: true
    },
    edit: {
      editButtonContent: '<i class="material-icons">edit</i>',
      saveButtonContent: '<i class="material-icons">checkmark</i>',
      cancelButtonContent:'<i class="material-icons">close</i>',
    },
    delete: {
      deleteButtonContent: '<i class="material-icons">delete</i>',
      confirmDelete: true
    },
    columns: {
      id: {
        title: 'ID'
      },
      name: {
        title: 'Full Name'
      },
      username: {
        title: 'User Name'
      },
      email: {
        title: 'Email'
      }
    }
  };
  data = [
    {
      id: 1,
      name: 'Leanne Graham',
      username: 'Bret',
      email: 'Sincere@april.biz',
    },
    {
      id: 2,
      name: 'Ervin Howell',
      username: 'Antonette',
      email: 'Shanna@melissa.tv',
    },
    {
      id: 3,
      name: 'Clementine Bauch',
      username: 'Samantha',
      email: 'Nathan@yesenia.net',
    },
    {
      id: 4,
      name: 'Patricia Lebsack',
      username: 'Karianne',
      email: 'Julianne.OConner@kory.org',
    },
    {
      id: 5,
      name: 'Chelsey Dietrich',
      username: 'Kamren',
      email: 'Lucio_Hettinger@annie.ca',
    },
    {
      id: 6,
      name: 'Mrs. Dennis Schulist',
      username: 'Leopoldo_Corkery',
      email: 'Karley_Dach@jasper.info',
    },
    {
      id: 7,
      name: 'Kurtis Weissnat',
      username: 'Elwyn.Skiles',
      email: 'Telly.Hoeger@billy.biz',
    },
    {
      id: 8,
      name: 'Nicholas Runolfsdottir V',
      username: 'Maxime_Nienow',
      email: 'Sherwood@rosamond.me',
    },
    {
      id: 9,
      name: 'Glenna Reichert',
      username: 'Delphine',
      email: 'Chaim_McDermott@dana.io',
    },
    {
      id: 10,
      name: 'Clementina DuBuque',
      username: 'Moriah.Stanton',
      email: 'Rey.Padberg@karina.biz',
    },
    {
      id: 11,
      name: 'Nicholas DuBuque',
      username: 'Nicholas.Stanton',
      email: 'Rey.Padberg@rosamond.biz',
    },
    {
      id: 12,
      name: 'Gordon Freeman',
      username: 'Crowbar',
      email: 'gordon.freeman@black-mesa.science',
    },
  ];




  ngOnInit(): void {
    this.getTypes();
    
  }

  getTypes() {
    this.firestore.collection('types').valueChanges({ idField: 'id'}).subscribe((data:any) => {
      console.log(data);
      this.data = data;
    })
  }

  openTypesForm() {
    this.router.navigate(['/admin/types/form']);
  }

}
