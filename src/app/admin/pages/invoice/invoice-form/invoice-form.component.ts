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
  isEditing: boolean = false;
  clients: any[] = [];
  projects: any[] = [];
  filteredProjects: any[] = [];
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
  hasSignature: boolean = false;
  signaturePadOptions: Object = {
    minWidth: 1,
    maxWidth: 2,
    penColor: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255,255,255)',
    throttle: 16,
    velocityFilterWeight: 0.7,
    dotSize: 1,
    minDistance: 1
  };

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<InvoiceFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private afs: AngularFirestore
  ) {}

  ngOnInit() {
    this.isEditing = !!this.data.invoice;
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
      clientId: [this.data.invoice?.clientId || ''],
      clientName: [this.data.invoice?.clientName || ''],
      projectId: [this.data.invoice?.projectId || ''],
      projectName: [this.data.invoice?.projectName || ''],
      subject: [this.data.invoice?.subject || '', Validators.required],
      items: this.fb.array(this.data.invoice?.items?.length ? this.data.invoice.items.map((item: any) => this.createItem(item)) : [this.createItem()]),
      notes: [this.data.invoice?.notes || ''],
      paymentOptions: [this.data.invoice?.paymentOptions || ''],
      total: [this.data.invoice?.total || 0],
      signature: new FormControl(''),
    });
    this.form.get('items')!.valueChanges.subscribe(() => this.updateTotal());
    
    // Load clients and projects
    this.loadClients();
    this.loadProjects();
    
    // Listen for client selection changes
    this.form.get('clientId')!.valueChanges.subscribe(clientId => {
      this.onClientChange(clientId);
    });
    
    // Also listen for project selection changes
    this.form.get('projectId')!.valueChanges.subscribe(projectId => {
      this.onProjectChange(projectId);
    });
    
    // Add a timeout to ensure data is loaded and debug
    setTimeout(() => {
      console.log('=== After initialization timeout ===');
      console.log('Clients:', this.clients);
      console.log('Projects:', this.projects);
      console.log('Filtered Projects:', this.filteredProjects);
      
      // If still no data, try to add demo data
      if (this.clients.length === 0 || this.projects.length === 0) {
        console.log('No data found after timeout, adding demo data');
        if (this.clients.length === 0) {
          this.addDemoClients();
        }
        if (this.projects.length === 0) {
          this.addDemoProjects();
        }
      }
    }, 3000);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.signaturePad) {
        this.signaturePad.clear();
        this.signaturePad.resizeCanvas();
        
        if (this.form.value.signature) {
          this.signaturePad.fromDataURL(this.form.value.signature);
          this.signatureImage = this.form.value.signature;
          this.hasSignature = true;
        }
      }
    }, 100);
  }



  onSignatureBegin() {
    this.hasSignature = true;
  }

  saveSignature() {
    if (this.signaturePad) {
      if (!this.signaturePad.isEmpty()) {
        this.signatureImage = this.signaturePad.toDataURL();
        this.form.patchValue({ signature: this.signatureImage });
        this.hasSignature = true;
      } else {
        this.signatureImage = null;
        this.form.patchValue({ signature: null });
        this.hasSignature = false;
      }
    }
  }

  clearSignature() {
    if (this.signaturePad) {
      this.signaturePad.clear();
      this.signatureImage = null;
      this.form.patchValue({ signature: null });
      this.hasSignature = false;
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

  loadClients() {
    this.afs.collection('clients').valueChanges({ idField: 'id' }).subscribe((clients: any[]) => {
      this.clients = clients;
      console.log('Loaded clients:', clients); // Debug log
      
      // If no clients found, add some demo clients for testing
      if (!clients || clients.length === 0) {
        console.log('No clients found, adding demo clients');
        this.addDemoClients();
      }
    });
  }

  addDemoClients() {
    // Add some demo clients for testing
    const demoClients = [
      {
        id: 'client1',
        name: 'Tech Solutions Inc',
        companyName: 'Tech Solutions Inc',
        email: 'contact@techsolutions.com',
        phone: '+91-9876543210',
        address: '123 Tech Street, Bangalore, Karnataka'
      },
      {
        id: 'client2',
        name: 'Digital Marketing Pro',
        companyName: 'Digital Marketing Pro',
        email: 'info@digitalmarketingpro.com',
        phone: '+91-9876543211',
        address: '456 Digital Avenue, Mumbai, Maharashtra'
      }
    ];
    
    // Add demo clients to Firestore
    demoClients.forEach(client => {
      this.afs.collection('clients').doc(client.id).set(client);
    });
  }

  loadProjects() {
    console.log('=== Loading projects ===');
    this.afs.collection('projects').valueChanges({ idField: 'id' }).subscribe({
      next: (projects: any[]) => {
        console.log('Projects loaded successfully:', projects);
        this.projects = projects || [];
        
        // If no projects found, add some demo projects for testing
        if (!projects || projects.length === 0) {
          console.log('No projects found, adding demo projects');
          this.addDemoProjects();
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.projects = [];
        // Add demo projects on error
        this.addDemoProjects();
      }
    });
  }

  addDemoProjects() {
    // Add some demo projects for testing
    const demoProjects = [
      {
        id: 'proj1',
        name: 'Website Development',
        projectName: 'Website Development',
        clientId: 'client1',
        client_id: 'client1',
        description: 'Complete website development project'
      },
      {
        id: 'proj2',
        name: 'Mobile App Development',
        projectName: 'Mobile App Development',
        clientId: 'client1',
        client_id: 'client1',
        description: 'iOS and Android app development'
      },
      {
        id: 'proj3',
        name: 'E-commerce Platform',
        projectName: 'E-commerce Platform',
        clientId: 'client2',
        client_id: 'client2',
        description: 'Online shopping platform development'
      }
    ];
    
    // Add demo projects to Firestore
    demoProjects.forEach(project => {
      this.afs.collection('projects').doc(project.id).set(project);
    });
  }

  onClientChange(clientId: string) {
    console.log('=== onClientChange called ===');
    console.log('Client changed to:', clientId); // Debug log
    console.log('Available projects:', this.projects); // Debug log
    console.log('Available clients:', this.clients); // Debug log
    
    if (clientId) {
      // Find the selected client
      const selectedClient = this.clients.find(client => client.id === clientId);
      console.log('Selected client:', selectedClient); // Debug log
      
      if (selectedClient) {
        // Update client name
        this.form.patchValue({
          clientName: selectedClient.name || selectedClient.companyName
        });
        
        // Filter projects for this client - try multiple possible field names
        this.filteredProjects = this.projects.filter(project => {
          const projectClientId = project.clientId || project.client_id || project.clientid || project.client || project.clientId;
          console.log(`Project ${project.name || project.projectName}: clientId=${projectClientId}, looking for=${clientId}`); // Debug log
          return projectClientId === clientId;
        });
        
        console.log('Filtered projects:', this.filteredProjects); // Debug log
        
        // Clear project selection when client changes
        this.form.patchValue({
          projectId: '',
          projectName: ''
        });
      }
    } else {
      // Clear client and project data when no client is selected
      this.form.patchValue({
        clientName: '',
        projectId: '',
        projectName: ''
      });
      this.filteredProjects = [];
    }
    
    // Force change detection
    setTimeout(() => {
      console.log('After timeout - filteredProjects:', this.filteredProjects);
    }, 100);
  }

  refreshFilteredProjects() {
    const clientId = this.form.get('clientId')?.value;
    if (clientId) {
      this.onClientChange(clientId);
    }
  }

  onProjectChange(projectId: string) {
    console.log('=== onProjectChange called ===');
    console.log('Project changed to:', projectId); // Debug log
    console.log('Available filtered projects:', this.filteredProjects); // Debug log
    console.log('Available all projects:', this.projects); // Debug log
    
    if (projectId) {
      // Find the selected project from either filtered or full list
      let selectedProject = this.filteredProjects.find(project => project.id === projectId);
      
      if (!selectedProject) {
        // If not found in filtered, search in full projects list
        selectedProject = this.projects.find(project => project.id === projectId);
      }
      
      console.log('Selected project:', selectedProject); // Debug log
      
      if (selectedProject) {
        // Update project name - try multiple possible field names
        const projectName = selectedProject.name || selectedProject.projectName || selectedProject.title || selectedProject.project_name;
        this.form.patchValue({
          projectName: projectName
        });
        
        // Auto-fill subject with project name if subject is empty
        if (!this.form.get('subject')!.value) {
          this.form.patchValue({
            subject: projectName
          });
        }
        
        // If no client is selected but a project is selected, try to auto-select the client
        if (!this.form.get('clientId')?.value && selectedProject.clientId) {
          const projectClientId = selectedProject.clientId || selectedProject.client_id;
          if (projectClientId) {
            this.form.patchValue({
              clientId: projectClientId
            });
            // Trigger client change to update filtered projects
            this.onClientChange(projectClientId);
          }
        }
      }
    } else {
      // Clear project name when no project is selected
      this.form.patchValue({
        projectName: ''
      });
    }
  }

  get filteredProjectsWithSelected(): any[] {
    const filtered = this.filteredProjects || [];
    const selectedProjectId = this.form?.get('projectId')?.value;
    if (!selectedProjectId) return filtered;
    const alreadyIncluded = filtered.some(p => p.id === selectedProjectId);
    if (alreadyIncluded) return filtered;
    // Try to find the selected project in all projects
    const selected = this.projects.find(p => p.id === selectedProjectId);
    if (selected) return [...filtered, selected];
    return filtered;
  }
}

