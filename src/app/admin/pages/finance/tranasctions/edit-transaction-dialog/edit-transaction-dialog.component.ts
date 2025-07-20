import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { GeneralService } from '../../../../../core/services/general.service';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Transaction } from '../tranasctions.component';
import { MatDialog } from '@angular/material/dialog';
import { TypesformDialogComponent } from '../../../types/typesform/typesform-dialog.component';

export interface User {
  name: string;
}

@Component({
  selector: 'app-edit-transaction-dialog',
  templateUrl: './edit-transaction-dialog.component.html',
  styleUrls: ['./edit-transaction-dialog.component.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class EditTransactionDialogComponent implements OnInit {
  editForm: FormGroup;
  isLoading = false;
  loading = false;

  // Data from create transaction form
  loanersList: any;
  expensetypes: any;
  incometypes: any;
  lenders: any;
  loanFrom: any;
  lendedList: any[] = [];
  consumedFrom: any;
  
  todayIn: number = 0;
  todayOut: number = 0;
  datePin: boolean = false;
  amount: any;
  action: any = 'OUT';
  actionType: any = ["IN", "OUT"];
  typeListOut: any = ["EXPENSE", "LENDING"];
  typeListIn: any = ["INCOME", "LOAN", "RETURN"];
  type: any = this.action == 'IN' ? 'INCOME' : 'EXPENSE';
  expenseType: any = ["FOOD", "RENT", "OTHER", "BILL"];
  expenseof: any = '';
  incomeof: any = '';
  tid: any;
  date: any = new Date();
  editDate: boolean = false;
  lendedBy: any = '';
  notes: any = '';
  loanReturn: any;
  loanToClear: any = '';
  
  @ViewChild('autoInput') input: any;
  options: User[] = [{name: 'test'}, {name: 'test2'}];
  filteredOptions$: Observable<any[]> | undefined;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditTransactionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Transaction,
    private afs: AngularFirestore,
    private service: GeneralService,
    private dialog: MatDialog
  ) {
    this.editForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0)]],
      action: ['', Validators.required],
      type: ['', Validators.required],
      date: ['', Validators.required],
      notes: [''],
      expenseof: [''],
      incomeof: [''],
      loanTo: [''],
      loanFrom: [''],
      lendedBy: [''],
      tid: ['']
    });
  }

  ngOnInit(): void {
    this.getTypes();
    this.getLenders();
    this.populateForm();
  }

  getTypes() {
    this.afs.collection('types').valueChanges({idField: 'id'}).subscribe((res: any) => {
      console.log("expense type:", res);
      this.expensetypes = res.filter((item: any) => item.category == 'EXPENSE');
      console.log("expense type:", this.expensetypes);
      this.incometypes = res.filter((item: any) => item.category == 'INCOME');
      console.log("income type:", this.incometypes);
      // sort expense types by position
      this.expensetypes.sort((a: any, b: any) => a.position - b.position);
      this.expensetypes = this.expensetypes.filter((element: any) => element.is_active === true);
    });
  }

  getLenders() {
    this.afs.collection('lenders').valueChanges({idField: 'id'}).subscribe((res: any) => {
      console.log(res);
      this.lenders = res;
      this.filteredOptions$ = of(this.lenders);
    });
    console.log(this.expensetypes);
  }

  createLenders(name: any) {
    let temp = {
      name: name,
      createdAt: new Date(),
      updateAt: new Date(),
      is_Active: true,
    };
    console.log(temp);
    this.afs.collection('lenders').add(temp).then((docRef: any) => {
      console.log("Document written with ID: ", docRef.id);
    }).catch((error: any) => {
      console.error("Error adding document: ", error);
    });
  }

  populateForm(): void {
    console.log('data :',this.data)
    const transactionDate = this.data.date && (this.data.date as any).toDate ? 
      (this.data.date as any).toDate() : new Date(this.data.date);

    // Populate form data
    this.amount = this.data.amount;
    this.action = this.data.action;
    this.type = this.data.type;
    this.date = transactionDate;
    this.notes = this.data.notes || '';
    this.expenseof = this.data.expenseof || '';
    this.incomeof = this.data.incomeof || '';
    this.lendedBy = this.data.lendedBy || '';
    this.loanFrom = this.data.loanFrom || '';
    this.tid = this.data.tid || '';

    // Update form controls
    this.editForm.patchValue({
      amount: this.amount,
      action: this.action,
      type: this.type,
      date: this.date,
      notes: this.notes,
      expenseof: this.expenseof,
      incomeof: this.incomeof,
      loanTo: this.data.loanTo || '',
      loanFrom: this.loanFrom,
      lendedBy: this.lendedBy,
      tid: this.tid
    });
  }

  onSubmit(): void {
    if (this.editForm.valid && this.amount > 0) {
      // Validation for RETURN transactions
      if (this.type === 'RETURN' && (!this.loanReturn || !this.loanToClear)) {
        this.service.openSnackBar('Please select both a person and a loan to clear for return transactions', 'Close');
        return;
      }

      // Validate return amount doesn't exceed loan amount
      if (this.type === 'RETURN' && this.loanToClear && this.lendedList && Array.isArray(this.lendedList)) {
        const selectedLoan = this.lendedList.find((loan: any) => loan.id === this.loanToClear);
        if (selectedLoan && this.amount > selectedLoan.amount) {
          this.service.openSnackBar(`Return amount cannot exceed the loan amount of ${this.formatCurrency(selectedLoan.amount)}`, 'Close');
          return;
        }
      }

      this.isLoading = true;
      
      let temp: any = {
        amount: this.amount,
        action: this.action,
        date: this.date,
        type: this.type,
        expenseof: this.expenseof,
        incomeof: this.incomeof,
        lendedBy: this.lendedBy?.name ? this.lendedBy?.name : this.lendedBy ? this.lendedBy : '',
        loanClear: false,
        loanFrom: this.loanFrom?.name ? this.loanFrom?.name : this.loanFrom ? this.loanFrom : '',
        notes: this.notes,
        tid: this.tid
      };

      // Add return-specific fields for RETURN transactions
      if (this.type == 'RETURN' && this.loanToClear) {
        temp.originalLendingId = this.loanToClear;
        temp.loanReturn = this.loanReturn?.name || this.loanReturn;
      }

      console.log("Temp ### ,", temp);
      console.log("Temp ### ,", this.lendedBy?.name);

      if (this.type == 'LENDING') {
        //check if loaner is already exist
        let loanerExist = false;
        this.lenders.forEach((element: any) => {
          if (element.name == this.lendedBy?.name) {
            loanerExist = true;
          }
        });
        if (!loanerExist) {
          this.createLenders(this.lendedBy);
        }
      }

      if (this.type == 'LOAN') {
        //check if loaner is already exist
        let loanerExist = false;
        this.lenders.forEach((element: any) => {
          if (element.name == this.loanFrom?.name) {
            loanerExist = true;
          }
        });
        if (!loanerExist) {
          this.createLenders(this.loanFrom);
        }
      }

      this.dialogRef.close(temp);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'EXPENSE':
        return 'shopping_cart';
      case 'INCOME':
        return 'trending_up';
      case 'LENDING':
        return 'person_add';
      case 'LOAN':
        return 'handshake';
      case 'RETURN':
        return 'assignment_return';
      default:
        return 'receipt';
    }
  }

  getLendingTitle(): string {
    switch (this.type) {
      case 'LENDING':
        return 'Lending Details';
      case 'LOAN':
        return 'Loan Details';
      case 'RETURN':
        return 'Return Details';
      default:
        return 'Lending Details';
    }
  }

  getNotesStepNumber(): number {
    let step = 1;
    if (this.action) step++;
    if (this.type) step++;
    if (this.type === 'EXPENSE' && this.expensetypes?.length > 0) step++;
    if (this.type === 'INCOME' && this.incometypes?.length > 0) step++;
    if (this.type === 'LENDING' || this.type === 'LOAN' || this.type === 'RETURN') step++;
    return step;
  }

  getCategoryStepNumber(): number {
    return this.action ? 2 : 1;
  }

  getSubcategoryStepNumber(): number {
    let step = 2;
    if (this.type === 'EXPENSE' && this.expensetypes?.length > 0) step++;
    if (this.type === 'INCOME' && this.incometypes?.length > 0) step++;
    return step;
  }

  getLendingStepNumber(): number {
    let step = 2;
    if (this.type === 'EXPENSE' && this.expensetypes?.length > 0) step++;
    if (this.type === 'INCOME' && this.incometypes?.length > 0) step++;
    if (this.type === 'LENDING' || this.type === 'LOAN' || this.type === 'RETURN') step++;
    return step;
  }

  getTotalOutstandingAmount(): number {
    if (!this.lendedList || !Array.isArray(this.lendedList)) return 0;
    return this.lendedList.reduce((total: number, loan: any) => total + (loan.amount || 0), 0);
  }

  getSelectedLoanAmount(): number {
    if (!this.loanToClear || !this.lendedList || !Array.isArray(this.lendedList)) return 0;
    const selectedLoan = this.lendedList.find((loan: any) => loan.id === this.loanToClear);
    return selectedLoan ? selectedLoan.amount : 0;
  }

  private filter(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.lenders.filter((option: any) => 
      option.name.toLowerCase().includes(filterValue)
    );
  }

  getFilteredOptions(value: string): Observable<any[]> {
    return of(this.filter(value));
  }

  onChange() {
    this.filteredOptions$ = this.getFilteredOptions(this.lendedBy);
  }

  onSelectionChange($event: any) {
    this.lendedBy = $event;
  }

  onselect() {
    this.filteredOptions$ = of(this.lenders);
  }

  onReturnPersonSelected(event: any) {
    this.loanReturn = event.option.value;
    this.getLendings();
  }

  displayFn(country: any): any {
    return country && country.name ? country.name : country;
  }

  getLendings() {
    if (this.loanReturn) {
      const personName = this.loanReturn?.name || this.loanReturn;
      this.afs.collection('moneytransactions', ref => 
        ref.where('lendedBy', '==', personName)
           .where('type', '==', 'LENDING')
           .where('loanClear', '==', false)
           .orderBy('createdAt', 'desc')
      ).valueChanges({idField: 'id'}).subscribe((res: any) => {
        this.lendedList = res;
        this.loanToClear = '';
      });
    }
  }

  updateLoanToClear() {
    if (this.loanToClear && this.lendedList && Array.isArray(this.lendedList)) {
      const selectedLoan = this.lendedList.find((loan: any) => loan.id === this.loanToClear);
      if (selectedLoan && this.amount > selectedLoan.amount) {
        this.service.openSnackBar(`Return amount cannot exceed the loan amount of ${this.formatCurrency(selectedLoan.amount)}`, 'Close');
        this.amount = selectedLoan.amount;
      }
    }
  }

  // Method to open dialog for creating new expense type
  openNewExpenseTypeDialog(): void {
    const dialogRef = this.dialog.open(TypesformDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { category: 'EXPENSE' },
      disableClose: true,
      panelClass: 'types-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.service.openSnackBar('New expense type created successfully!', 'Close');
        // Refresh the expense types list
        this.getTypes();
        // Update form with new type if it matches the current selection
        if (result.type && result.type.name) {
          this.expenseof = result.type.name;
        }
      }
    });
  }

  // Method to open dialog for creating new income type
  openNewIncomeTypeDialog(): void {
    const dialogRef = this.dialog.open(TypesformDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { category: 'INCOME' },
      disableClose: true,
      panelClass: 'types-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.service.openSnackBar('New income type created successfully!', 'Close');
        // Refresh the income types list
        this.getTypes();
        // Update form with new type if it matches the current selection
        if (result.type && result.type.name) {
          this.incomeof = result.type.name;
        }
      }
    });
  }
} 