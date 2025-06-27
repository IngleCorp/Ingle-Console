import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { SignaturePad } from 'angular2-signaturepad';

@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html',
  styleUrl: './invoice-form.component.scss'
})
export class InvoiceFormComponent implements OnInit {
  form!: FormGroup;
  readonly hsnCodes = [
    { SAC: '998313', Description: 'Information technology (IT) consulting and support services' },
    { SAC: '998314', Description: 'IT infrastructure and network management services' },
    { SAC: '998315', Description: 'Software development services' },
    { SAC: '998316', Description: 'Systems analysis and design services' },
    { SAC: '998317', Description: 'Web hosting, cloud services, and application service provisioning' },
    { SAC: '998318', Description: 'Data processing, hosting, and related services' },
    { SAC: '998319', Description: 'Other IT services not elsewhere classified' },
    { SAC: '998421', Description: 'Software publishing services – includes packaged software, ready-to-use' },
    { SAC: '998423', Description: 'Licensing of software (other than custom software) – includes right to use standard software products' }
  ];

  @ViewChild('signaturePad') signaturePad!: SignaturePad;
  signatureImage: string | null = null;
  signaturePadOptions: Object = {
    minWidth: 1,
    maxWidth: 2.5,
    penColor: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255,255,255)'
  };

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<InvoiceFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private afs: AngularFirestore
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      company: this.fb.group({
        name: [this.data.invoice?.company?.name || '', Validators.required],
        gstin: [this.data.invoice?.company?.gstin || '', Validators.required],
        address: [this.data.invoice?.company?.address || '', Validators.required],
      }),
      invoiceNumber: [this.data.invoice?.invoiceNumber || '', Validators.required],
      invoiceDate: [this.data.invoice?.invoiceDate || '', Validators.required],
      dueDate: [this.data.invoice?.dueDate || '', Validators.required],
      terms: [this.data.invoice?.terms || '', Validators.required],
      placeOfSupply: [this.data.invoice?.placeOfSupply || '', Validators.required],
      billTo: this.fb.group({
        company: [this.data.invoice?.billTo?.company || '', Validators.required],
        address: [this.data.invoice?.billTo?.address || '', Validators.required],
        gstin: [this.data.invoice?.billTo?.gstin || '', Validators.required],
      }),
      subject: [this.data.invoice?.subject || '', Validators.required],
      items: this.fb.array(this.data.invoice?.items?.length ? this.data.invoice.items.map((item: any) => this.createItem(item)) : [this.createItem()]),
      notes: [this.data.invoice?.notes || ''],
      paymentOptions: [this.data.invoice?.paymentOptions || ''],
      total: [this.data.invoice?.total || 0],
      signature: new FormControl(''),
    });
    this.form.get('items')!.valueChanges.subscribe(() => this.updateTotal());
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.signaturePad) {
        this.signaturePad.clear();
        this.signaturePad.resizeCanvas();
        if (this.form.value.signature) {
          this.signaturePad.fromDataURL(this.form.value.signature);
          this.signatureImage = this.form.value.signature;
        }
      }
    }, 0);
  }

  saveSignature() {
    if (this.signaturePad) {
      if (!this.signaturePad.isEmpty()) {
        this.signatureImage = this.signaturePad.toDataURL();
        this.form.patchValue({ signature: this.signatureImage });
      } else {
        this.signatureImage = null;
        this.form.patchValue({ signature: null });
      }
    }
  }

  clearSignature() {
    if (this.signaturePad) {
      this.signaturePad.clear();
      this.signatureImage = null;
      this.form.patchValue({ signature: null });
    }
  }

  createItem(item: any = {}) {
    return this.fb.group({
      description: [item.description || '', Validators.required],
      hsn: [item.hsn || '', Validators.required],
      qty: [item.qty ?? 1, [Validators.required, Validators.min(1)]],
      rate: [item.rate ?? 0, [Validators.required, Validators.min(0)]],
      per: [item.per || 'Unit', Validators.required],
      igst: [item.igst ?? 18, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  get items() {
    return this.form.get('items') as FormArray;
  }

  getFormControl(row: any, field: string) {
    if (row && row.get && row.get(field)) {
      return row.get(field) as FormControl;
    }
    // Return a dummy FormControl to avoid template errors
    return new FormControl();
  }

  addItem() {
    this.items.push(this.createItem());
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  updateTotal() {
    const items = this.items.value;
    let subtotal = 0;
    let igst = 0;
    items.forEach((item: any) => {
      subtotal += item.qty * item.rate;
      igst += (item.qty * item.rate) * (item.igst / 100);
    });
    this.form.patchValue({ total: subtotal + igst }, { emitEvent: false });
  }

  async onSubmit() {
    this.saveSignature();
    if (this.form.valid) {
      try {
        await this.afs.collection('invoices').add({
          ...this.form.value,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        this.dialogRef.close(this.form.value);
      } catch (error) {
        alert('Failed to save invoice: ' + (error as any).message);
      }
    } else {
      this.markAllFieldsAsTouched(this.form);
      this.scrollToFirstInvalidControl();
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  markAllFieldsAsTouched(formGroup: FormGroup | FormArray) {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormControl) {
        control.markAsTouched();
        control.markAsDirty();
      } else if (control instanceof FormGroup || control instanceof FormArray) {
        this.markAllFieldsAsTouched(control);
      }
    });
  }

  scrollToFirstInvalidControl() {
    setTimeout(() => {
      const firstInvalid = document.querySelector('.ng-invalid:not(form):not(.ng-pristine)');
      if (firstInvalid) {
        (firstInvalid as HTMLElement).focus();
        (firstInvalid as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // Add getters for subtotal, igst, and totalAmount
  get subtotal(): number {
    return this.items.value
      .filter((item: any) => item && item.qty != null && item.rate != null)
      .reduce((sum: number, item: any) => sum + (item.qty * item.rate), 0);
  }

  get igst(): number {
    return this.items.value
      .filter((item: any) => item && item.qty != null && item.rate != null && item.igst != null)
      .reduce((sum: number, item: any) => sum + ((item.qty * item.rate) * (item.igst / 100)), 0);
  }

  get totalAmount(): number {
    return this.subtotal + this.igst;
  }

  // Temporary function to fill the form with demo data
  fillWithDemoData() {
    this.form.patchValue({
      company: {
        name: 'Demo Company Pvt Ltd',
        gstin: '27AAECS1234F1ZV',
        address: '123 Demo Street, Mumbai, Maharashtra',
        placeOfSupply: 'Maharashtra',
      },
      invoiceNumber: 'INV-2024-001',
      invoiceDate: '2024-06-01',
      dueDate: '2024-06-15',
      terms: '15 days',
      billTo: {
        company: 'Client Corp',
        address: '456 Client Avenue, Pune, Maharashtra',
        gstin: '27AAECC4321F1ZV',
      },
      subject: 'Web Development Project',
      notes: 'Thank you for your business!',
      paymentOptions: 'Bank Transfer, UPI',
    });
    // Set demo line items
    const itemsArray = this.form.get('items') as FormArray;
    itemsArray.clear();
    itemsArray.push(this.createItem({ description: 'Website Design', hsn: '9983', qty: 1, rate: 20000, per: 'Job', igst: 18 }));
    itemsArray.push(this.createItem({ description: 'Hosting (1 year)', hsn: '9983', qty: 1, rate: 5000, per: 'Year', igst: 18 }));
    this.updateTotal();
    this.signatureImage = null;
    this.form.patchValue({ signature: null });
  }
}
