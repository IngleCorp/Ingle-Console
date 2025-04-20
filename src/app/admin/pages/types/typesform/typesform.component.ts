import { Component ,OnInit} from '@angular/core';
  // import { Component, OnInit } from '@angular/core';
  import { FormGroup, FormControl, Validators } from '@angular/forms';
  import { Observable, of } from 'rxjs';

  
  @Component({
    selector: 'app-typesform',
    templateUrl: './typesform.component.html',
    styleUrls: ['./typesform.component.scss']
  })
  export class TypesformComponent implements OnInit {
    typesForm: FormGroup;
    loading:boolean = false;
    constructor() {
      this.typesForm = new FormGroup({
        name: new FormControl('', [Validators.required]),
        category: new FormControl('', [Validators.required]),
        position: new FormControl('', [Validators.required]),
        is_active: new FormControl(false),
        is_deleted: new FormControl(false)
      });
   
    }
    
    ngOnInit(): void {
      this.typesForm = new FormGroup({
        name: new FormControl('', [Validators.required]),
        category: new FormControl('', [Validators.required]),
        position: new FormControl('', [Validators.required]),
        is_active: new FormControl(false),
        is_deleted: new FormControl(false)
      });
    }
  
    onSubmit(): void {
      if (this.typesForm.valid) {
        console.log(this.typesForm.value);
        // Submit the form data to the server or perform any other desired action
      }
    }
  
    get name(): FormControl {
      return this.typesForm.get('name') as FormControl;
    }
  
    get category(): FormControl {
      return this.typesForm.get('category') as FormControl;
    }
  
    get position(): FormControl {
      return this.typesForm.get('position') as FormControl;
    }
  
    get is_active(): FormControl {
      return this.typesForm.get('is_active') as FormControl;
    }
  
    get is_deleted(): FormControl {
      return this.typesForm.get('is_deleted') as FormControl;
    }
  }
   




