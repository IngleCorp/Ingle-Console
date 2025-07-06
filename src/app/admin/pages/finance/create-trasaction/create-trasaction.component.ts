import { Component, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { GeneralService } from '../../../../core/services/general.service';
import { trigger, state, style, transition, animate } from '@angular/animations';
export interface User {
  name: string;
}
@Component({
  selector: 'app-create-trasaction',
  templateUrl: './create-trasaction.component.html',
  styleUrl: './create-trasaction.component.scss',
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})

export class CreateTrasactionComponent {

  loanersList: any;
  loading: boolean = false;
  expensetypes: any;
  incometypes: any;
  lenders: any;
  loanFrom: any;
  lendedList: any[] = []; // Initialize as empty array
  consumedFrom: any;
  
  todayIn: number=0;
  todayOut: number=0;
  constructor(private afs: AngularFirestore,private service:GeneralService) { }
  datePin:boolean=false;
  amount: any;
  action: any = 'OUT';
  actionType: any = ["IN", "OUT"];
  typeListOut: any = ["EXPENSE","LENDING"];
  typeListIn: any = ["INCOME","LOAN","RETURN"];
  type: any = this.action=='IN'?'INCOME':'EXPENSE'; 
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
  options: User[]=[{name:'test'}, {name:'test2'}];
  filteredOptions$: Observable<any[]> | undefined;

  ngOnInit(): void {
    
    this.getTypes();
    this.getLenders();
    this.getMoneyTranaction();
  }

  



  private _filter(name: string): User[] {
    const filterValue = name.toLowerCase();

    return this.options.filter(option => option.name.toLowerCase().includes(filterValue));
  }
  // getCustomers() {
  //   //  get customers where is_active is true
  //     this.afs.collection('customer',ref => ref.where('is_active','==',true).orderBy('name','asc')).valueChanges({idField:'id'}).subscribe((res:any) => {
  //       console.log(res);
  //       this.loanersList = res;
  //       this.loanersListTemp = res;
  //     })

  //    }



 


  getTypes() {//  get customers where is_active is true
      this.afs.collection('types').valueChanges({idField:'id'}).subscribe((res:any) => {
        console.log("expense type:",res);
        this.expensetypes = res.filter((item:any) => item.category=='EXPENSE');
        console.log("expense type:",this.expensetypes);
        this.incometypes = res.filter((item:any) => item.category=='INCOME');
        console.log("income type:",this.incometypes);
        // sort expense types by positio  n
        this.expensetypes.sort((a: any, b: any) => a.position - b.position);
        this.expensetypes = this.expensetypes.filter((element: any) => element.is_active === true);
           })  
    }

  


  getLenders() {
      this.afs.collection('lenders').valueChanges({idField:'id'}).subscribe((res:any) => {
        console.log(res);
        this.lenders = res;
        this.filteredOptions$ = of(this.lenders);
        // this.options = res.map((item: any) => {
        //   return {name:item.name}
        // });
        // console.log("options",this.options);
      })
      console.log(this.expensetypes);
    }

    createLenders(name: any) {
      let temp={
        name: name,
        createdAt: new Date(),
        updateAt: new Date(),
        is_Active: true,
      }
      console.log(temp);
      this.afs.collection('lenders').add(temp).then((docRef: any) => {
        console.log("Document written with ID: ", docRef.id);
      }).catch((error: any) => {
          console.error("Error adding document: ", error);
        });
    }


  add() {
if(this.amount>0){

    // Validation for RETURN transactions
    if(this.type === 'RETURN' && (!this.loanReturn || !this.loanToClear)) {
      this.service.openSnackBar('Please select both a person and a loan to clear for return transactions', 'Close');
      return;
    }

    // Validate return amount doesn't exceed loan amount
    if(this.type === 'RETURN' && this.loanToClear && this.lendedList && Array.isArray(this.lendedList)) {
      const selectedLoan = this.lendedList.find((loan: any) => loan.id === this.loanToClear);
      if(selectedLoan && this.amount > selectedLoan.amount) {
        this.service.openSnackBar(`Return amount cannot exceed the loan amount of ${this.formatCurrency(selectedLoan.amount)}`, 'Close');
        return;
      }
    }

    this.loading = true;
    let Tid= 'TX-'+new Date().getTime();
      let temp: any = {
        amount: this.amount,
        action: this.action,
        date: this.date,
        type: this.type,
        expenseof: this.expenseof,
        incomeof: this.incomeof,
        lendedBy: this.lendedBy.name?this.lendedBy?.name:this.lendedBy?this.lendedBy:'',
        loanClear: false,
        loanFrom: this.loanFrom?.name?this.loanFrom?.name:this.loanFrom?this.loanFrom:'',
        createdAt: new Date(),
        updateAt: new Date(),
        notes: this.notes,
        tid: Tid,
        createdBy: localStorage.getItem('userid') || '',
        createdByName: localStorage.getItem('username') || 'Unknown User',
      }

      // Add return-specific fields for RETURN transactions
      if(this.type=='RETURN' && this.loanToClear){
        temp.originalLendingId = this.loanToClear;
        temp.loanReturn = this.loanReturn?.name || this.loanReturn;
      }

      console.log("Temo ### ,",temp);
      console.log("Temo ### ,",this.lendedBy?.name);


      if(this.type=='LENDING'){
          //check if loaner is already exist
          let loanerExist=false;
          this.lenders.forEach((element: any) => {
            if(element.name==this.lendedBy?.name){
              loanerExist=true;
            }
          }
          );
          if(!loanerExist){
            this.createLenders(this.lendedBy);
          }
    
      }
      if(this.type=='LOAN'){
        //check if loaner is already exist
        let loanerExist=false;
        this.lenders.forEach((element: any) => {
          if(element.name==this.loanFrom?.name){
            loanerExist=true;
          }
        }
        );
        if(!loanerExist){
          this.createLenders(this.loanFrom);
        }
      }
      if(this.type=='RETURN'){
        //check if loaner is already exist
        if(this.loanReturn){
        this.updateLoanToClear();
        }
      }

      console.log(temp);
      this.afs.collection('moneytransactions').add(temp).then((docRef: any) => {
        // Record activity
        this.afs.collection('activities').add({
          type: 'transaction',
          action: 'Created',
          entityId: docRef.id,
          entityName: Tid,
          details: `New transaction recorded: ${this.amount} (${this.action}) (${this.type}) (${this.expenseof}) (${this.incomeof})`,
          createdAt: new Date(),
          createdBy: localStorage.getItem('userid') || '',
          createdByName: localStorage.getItem('username') || 'Unknown User',
          icon: 'account_balance_wallet'
        });
        this.service.openSnackBar('Transaction Added Successfully', 'Close');
        this.loading = false;
       
        this.resetForm();
        
      }).catch((error: any) => {
          console.error("Error adding document: ", error);
          this.loading = false;
        });
      }
      else{
        this.service.openSnackBar('Amount required', 'Close');
      }
    }
  //
  

    resetForm(){
      this.amount=0;
      // this.action=this.a;
      // this.type='INCOME';
      this.expenseof='';
      this.incomeof='';
      this.lendedBy='';
      this.loanFrom='';
      this.loanReturn='';
      this.loanToClear='';
      this.lendedList=[];
      this.notes='';
      if(!this.datePin){
        this.date=new Date();
      }
     
      this.editDate=false;
    }





  private filter(value: string): any[] {
    const filterValue = value.toString().toLowerCase();
    console.log(this.lenders);
    console.log(filterValue);
    return this.lenders.filter((optionValue: any) => optionValue['name'].toString().toLowerCase().includes(filterValue));
  }


  getFilteredOptions(value: string): Observable<any[]> {
    return of(value).pipe(
      map(filterString => this.filter(filterString)),
    );
  }


  onChange() {
    console.log('check Point ...',this.type);

    this.filteredOptions$ = this.getFilteredOptions(this.input.nativeElement.value);
  }

  onSelectionChange($event: any) {
    this.filteredOptions$ = this.getFilteredOptions($event);
    console.log('check Point',this.type);
    
    
  }


  onselect(){
    console.log('onselect called, loanReturn:', this.loanReturn);
    if(this.type === 'RETURN' && this.loanReturn){
      // Small delay to ensure the value is set
      setTimeout(() => {
        this.getLendings();
      }, 100);
    }
  }

  // Handle return person selection
  onReturnPersonSelected(event: any) {
    console.log('Return person selected:', event.option.value);
    this.loanReturn = event.option.value;
    
    // Clear previous loan selection
    this.loanToClear = '';
    this.lendedList = [];
    
    // Fetch lendings for the selected person
    if(this.type === 'RETURN' && this.loanReturn) {
      this.getLendings();
    }
  }

  displayFn(country: any): any {
    return country && country.name ? country.name : '';
  }


  getLendings() {
    this.afs.collection('moneytransactions', ref => ref.where('type', '==', 'LENDING').orderBy('createdAt', 'desc')).valueChanges({idField:'id'}).subscribe((res:any) => {
      console.log('All lending transactions:', res);
      this.lendedList = res;
      
      // Filter by the person we're returning money to and loans that are not fully cleared
      let temp = this.lendedList.filter((item: any) => {
        const personName = this.loanReturn?.name || this.loanReturn;
        return item.lendedBy === personName && item.loanClear === false;
      });
      
      console.log('Filtered lending transactions for', this.loanReturn?.name || this.loanReturn, ':', temp);
      this.lendedList = temp;

    },
    (error: any) => {
      console.log('Error fetching lendings:', error);
    }
    );
  }


  updateLoanToClear() {
    console.log(this.loanToClear); // Display the selected value
    
    if (!this.lendedList || !Array.isArray(this.lendedList)) {
      console.error('lendedList is not available');
      return;
    }
    
    this.lendedList.forEach((element: any) => {
      if(element.id==this.loanToClear){
        let payload;

        if(this.amount<element.amount){
          payload= {loanClear: false,
          updatedAt: new Date(),
          AmountReturned: this.amount,
          amountActual: element.amount,
          amount: element.amount-this.amount,

          }
        }
        else{
          payload= {
            loanClear: true,
            updatedAt: new Date(),

            }
        }
        
        this.afs.collection('moneytransactions').doc(element.id).update(payload).then((res: any) => {
          console.log(res);
          this.service.openSnackBar('Loan Cleared Successfully', 'Close');
          this.getLendings();
        })
        .catch((error: any) => {
          console.log(error);
        })
      }
    }
    );
  }

  // Enhanced method to handle return transaction creation with proper linking
  createReturnTransaction() {
    if (this.type === 'RETURN' && this.loanToClear) {
      // Create the return transaction with originalLendingId
      const returnTransaction = {
        amount: this.amount,
        action: 'IN',
        type: 'RETURN',
        date: this.date,
        notes: this.notes,
        createdAt: new Date(),
        createdBy: localStorage.getItem('userid') || '',
        createdByName: localStorage.getItem('username') || 'Unknown User',
        tid: this.tid,
        originalLendingId: this.loanToClear // Link to the original lending transaction
      };

      // Create the return transaction
      this.afs.collection('moneytransactions').add(returnTransaction).then((docRef) => {
        console.log('Return transaction created with ID:', docRef.id);
        // Then update the lending transaction
        this.updateLoanToClear();
      }).catch((error) => {
        console.error('Error creating return transaction:', error);
        this.service.openSnackBar('Error creating return transaction', 'Close');
      });
    }
  }




 



  getMoneyTranaction() {
    // get all money transaction with type LENDING and order by createdAt
    this.afs.collection('moneytransactions', ref => ref.orderBy('createdAt', 'desc')).valueChanges({idField:'id'}).subscribe((res:any) => {
      console.log(res);
      let todaysIN=0;
      let todaysOUT=0;
      let date = new Date();
      let today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      let todaysTranaction:any=[];
      res.forEach((item:any) => {
        // extract date from firestore timestamp without time
        let itemDate = new Date(item?.date?.toDate().getFullYear(), item?.date?.toDate().getMonth(), item?.date?.toDate().getDate());
        if(itemDate.getTime() == today.getTime()){
          todaysTranaction.push(item);  
        }
      });
      todaysTranaction.forEach((item:any) => {
        if(item.action=='IN' && item.type !== 'RETURN'){
          // Exclude RETURN transactions from income as they are not actual income
          todaysIN += item.amount;
        }else if(item.action=='OUT' && item.type !== 'LENDING'){
          // Exclude LENDING transactions from expenses calculation
          todaysOUT += item.amount;
        }
      });
      this.todayIn = todaysIN;
      this.todayOut = todaysOUT;
      // get active lendings
    })
  }

  // Helper method to format currency
  formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Helper method to get category icons
  getCategoryIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'EXPENSE': 'remove_circle_outline',
      'LENDING': 'handshake',
      'INCOME': 'add_circle_outline',
      'LOAN': 'account_balance',
      'RETURN': 'assignment_return'
    };
    return iconMap[category] || 'category';
  }



  // Helper method to get lending title
  getLendingTitle(): string {
    if (this.type === 'LENDING') {
      return 'Lending Details';
    } else if (this.type === 'LOAN') {
      return 'Loan Details';
    } else if (this.type === 'RETURN') {
      return 'Return Details';
    }
    return 'Transaction Details';
  }

  // Helper method to get notes step number
  getNotesStepNumber(): number {
    let stepNumber = 1; // Step 1: Transaction Type (always present)
    
    if (this.action) {
      stepNumber++; // Step 2: Category Selection
    }
    
    // Step 3: Either subcategory or lending details (mutually exclusive)
    if (this.type === 'EXPENSE' && this.expensetypes && this.expensetypes.length > 0) {
      stepNumber++; // Step 3: Expense subcategory
    } else if (this.type === 'INCOME' && this.incometypes && this.incometypes.length > 0) {
      stepNumber++; // Step 3: Income subcategory
    } else if (this.type === 'LENDING' || this.type === 'LOAN' || this.type === 'RETURN') {
      stepNumber++; // Step 3: Lending/Loan Details
    }
    
    stepNumber++; // Final step: Additional Notes
    
    return stepNumber;
  }

  // Helper method to get category step number
  getCategoryStepNumber(): number {
    return 2; // Category is always step 2
  }

  // Helper method to get subcategory step number
  getSubcategoryStepNumber(): number {
    return 3; // Subcategory is always step 3 when it exists
  }

  // Helper method to get lending details step number
  getLendingStepNumber(): number {
    return 3; // Lending details is always step 3 for lending transactions
  }

  // Helper method to calculate total outstanding amount for a person
  getTotalOutstandingAmount(): number {
    if (!this.lendedList || !Array.isArray(this.lendedList) || this.lendedList.length === 0) return 0;
    
    return this.lendedList.reduce((total: number, item: any) => {
      return total + (item.amount || 0);
    }, 0);
  }

  // Helper method to get selected loan amount
  getSelectedLoanAmount(): number {
    if (!this.loanToClear || !this.lendedList || !Array.isArray(this.lendedList)) return 0;
    
    const selectedLoan = this.lendedList.find((loan: any) => loan.id === this.loanToClear);
    return selectedLoan ? selectedLoan.amount : 0;
  }

}
