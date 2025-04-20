import { Component, OnInit,Input  } from '@angular/core';

@Component({
  selector: 'app-mat-spinner',
  templateUrl: './mat-spinner.component.html',
  styleUrl: './mat-spinner.component.scss'
})
export class MatSpinnerComponent implements OnInit {

  constructor() { }

  @Input() value : number = 100;
  @Input() diameter: number = 100;
  @Input() mode : any ="indeterminate";
  @Input() strokeWidth : number = 10;
  @Input() overlay: boolean = false;
  @Input() color: string = "primary";
  @Input() showText: string='loading...';

  ngOnInit() {

  }

}
