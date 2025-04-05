import { Component, ViewChild,AfterViewInit } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AngularFirestore } from '@angular/fire/compat/firestore';


export interface Car {
  make: string;
  model: string;
  price: number;
}
const CAR_DATA: Car[] = [
  { make: 'Toyota', model: 'Corolla', price: 30000 },
  { make: 'Ford', model: 'Fiesta', price: 25000 },
  { make: 'BMW', model: 'X5', price: 55000 },
  { make: 'Audi', model: 'A4', price: 45000 },
  { make: 'Honda', model: 'Civic', price: 27000 }
];

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements AfterViewInit  {
  constructor(private firestore: AngularFirestore) {
    this.getUsers();
  }
  displayedColumns: string[] = ['name', 'email', 'uid', 'actions'];
  dataSource = new MatTableDataSource(CAR_DATA);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  viewDetails(car: Car) {
    alert(`Viewing details for: ${car.make} ${car.model}, Price: $${car.price}`);
  }

  deleteCar(car: Car) {
    const index = this.dataSource.data.indexOf(car);
    if (index !== -1) {
      this.dataSource.data.splice(index, 1);
      this.dataSource.data = [...this.dataSource.data]; // Refresh the table
    }
  }


  getUsers() {
   this.firestore.collection('users').valueChanges({ idField: 'id'}).subscribe((data:any) => {
     console.log(data);
     this.dataSource.data = data;
   
   })
  }

}