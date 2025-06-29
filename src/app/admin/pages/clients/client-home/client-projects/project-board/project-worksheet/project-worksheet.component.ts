import { Component, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabGroup } from '@angular/material/tabs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WorksheetEntryFormComponent } from './worksheet-entry-form/worksheet-entry-form.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-project-worksheet',
  templateUrl: './project-worksheet.component.html',
  styleUrls: ['./project-worksheet.component.scss']
})
export class ProjectWorksheetComponent implements OnInit {
  @ViewChild(MatTabGroup) tabGroup!: MatTabGroup;

  projectId: string | null = null;
  isLoading: boolean = false;
  worksheetCollections: any[] = [];
  worksheetData: any[] = [];
  users: any[] = [];
  activeWorksheet: any = null;
  workRate: number = 400;
  totalHours: number = 0;
  totalHoursInMin: number = 0;
  costEstimate: number = 0;
  workHoursByUser: any[] = [];

  // Form for worksheet collection
  worksheetCollectionForm: FormGroup;
  showCollectionForm: boolean = false;

  // Status options
  statusOptions = [
    { value: 'Progress', title: 'Progress' },
    { value: 'Completed', title: 'Completed' },
    { value: 'Pending', title: 'Pending' },
    { value: 'Hold', title: 'Hold' }
  ];

  constructor(
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.worksheetCollectionForm = this.fb.group({
      name: ['', Validators.required],
      isActive: [true],
      position: [0]
    });
  }

  ngOnInit(): void {
    localStorage.setItem('pactivetab', 'worksheet');
    this.projectId = this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
    console.log('Project ID:', this.projectId);
    
    this.getUsers();
    this.getWorksheetCollections();
  }

  getUsers(): void {
    this.afs.collection('users').valueChanges({ idField: 'id' }).subscribe({
      next: (data: any) => {
        this.users = data || [];
        console.log('Users loaded:', this.users);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showNotification('Error loading users', 'error');
      }
    });
  }

  getWorksheetCollections(): void {
    if (!this.projectId) return;
    
    this.isLoading = true;
    this.afs.collection('projects').doc(this.projectId).collection('worksheets', ref => ref.where('isDeleted', '==', false))
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          console.log('Worksheet collections:', data);
          if (data.length > 0) {
            this.worksheetCollections = data.sort((a: any, b: any) => {
              return a.position - b.position;
            });
            this.activeWorksheet = this.worksheetCollections[0];
            this.getWorksheetData(this.worksheetCollections[0].id);
          } else {
            this.worksheetCollections = [];
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading worksheet collections:', error);
          this.isLoading = false;
          this.showNotification('Error loading worksheet collections', 'error');
        }
      });
  }

  selectWorksheet(worksheet: any): void {
    this.activeWorksheet = worksheet;
    this.getWorksheetData(worksheet.id);
  }

  getWorksheetData(worksheetId: string): void {
    if (!worksheetId || !this.projectId) return;
    
    // Get the worksheet name from the active worksheet
    const worksheetName = this.activeWorksheet?.name;
    if (!worksheetName) return;
    
    this.afs.collection('projects').doc(this.projectId).collection(worksheetName, ref => ref.orderBy('createdAt', 'desc'))
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (data: any) => {
          console.log('Worksheet data:', data);
          this.worksheetData = data || [];
          this.calculateTotals();
          this.calculateWorkHoursByUser();
        },
        error: (error) => {
          console.error('Error loading worksheet data:', error);
          this.showNotification('Error loading worksheet data', 'error');
        }
      });
  }

  addWorksheetCollection(): void {
    if (this.worksheetCollectionForm.invalid || !this.projectId) {
      this.showNotification('Please fill all required fields', 'error');
      return;
    }

    const collectionData = {
      ...this.worksheetCollectionForm.value,
      isDeleted: false,
      createdAt: new Date()
    };

    this.afs.collection('projects').doc(this.projectId).collection('worksheets').add(collectionData)
      .then(() => {
        this.showNotification('Worksheet collection added successfully', 'success');
        this.worksheetCollectionForm.reset();
        this.showCollectionForm = false;
      })
      .catch((error) => {
        console.error('Error adding worksheet collection:', error);
        this.showNotification('Error adding worksheet collection', 'error');
      });
  }

  updateWorksheetCollection(collection: any): void {
    if (!this.projectId) return;
    
    this.afs.collection('projects').doc(this.projectId).collection('worksheets').doc(collection.id).update({
      name: collection.name,
      isActive: collection.isActive,
      position: collection.position
    })
    .then(() => {
      this.showNotification('Worksheet collection updated successfully', 'success');
    })
    .catch((error) => {
      console.error('Error updating worksheet collection:', error);
      this.showNotification('Error updating worksheet collection', 'error');
    });
  }

  deleteWorksheetCollection(collectionId: string): void {
    if (!this.projectId) return;
    
    if (confirm('Are you sure you want to delete this worksheet collection? This will also delete all associated worksheet entries.')) {
      // Soft delete by setting isDeleted to true
      this.afs.collection('projects').doc(this.projectId).collection('worksheets').doc(collectionId).update({
        isDeleted: true
      })
      .then(() => {
        this.showNotification('Worksheet collection deleted successfully', 'success');
      })
      .catch((error) => {
        console.error('Error deleting worksheet collection:', error);
        this.showNotification('Error deleting worksheet collection', 'error');
      });
    }
  }

  addWorksheetEntry(entry: any = null): void {
    if (!this.activeWorksheet || !this.projectId) {
      this.showNotification('Please select a worksheet first', 'error');
      return;
    }

    const dialogRef = this.dialog.open(WorksheetEntryFormComponent, {
      width: '600px',
      data: {
        entry: entry,
        users: this.users
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (entry && entry.id) {
          // Update existing entry
          this.updateWorksheetEntry({ ...entry, ...result });
        } else {
          // Add new entry
          this.addWorksheetEntryToFirebase(result);
        }
      }
    });
  }

  addWorksheetEntryToFirebase(entryData: any): void {
    if (!this.activeWorksheet || !this.projectId) return;

    const worksheetName = this.activeWorksheet.name;
    if (!worksheetName) return;

    const worksheetData = {
      ...entryData,
      createdAt: entryData.date // Use the selected date
    };

    this.afs.collection('projects').doc(this.projectId).collection(worksheetName).add(worksheetData)
      .then(() => {
        this.showNotification('Worksheet entry added successfully', 'success');
      })
      .catch((error) => {
        console.error('Error adding worksheet entry:', error);
        this.showNotification('Error adding worksheet entry', 'error');
      });
  }

  updateWorksheetEntry(entry: any): void {
    if (!this.activeWorksheet || !this.projectId) return;
    
    const worksheetName = this.activeWorksheet.name;
    if (!worksheetName) return;
    
    // Prepare the update data
    const updateData: any = {
      task: entry.task,
      doneby: entry.doneby,
      status: entry.status,
      time: entry.time,
      remarks: entry.remarks
    };

    // If there's a new date, update the createdAt field
    if (entry.date) {
      updateData.createdAt = entry.date;
    }
    
    this.afs.collection('projects').doc(this.projectId).collection(worksheetName).doc(entry.id).update(updateData)
    .then(() => {
      this.showNotification('Worksheet entry updated successfully', 'success');
    })
    .catch((error) => {
      console.error('Error updating worksheet entry:', error);
      this.showNotification('Error updating worksheet entry', 'error');
    });
  }

  deleteWorksheetEntry(entryId: string): void {
    if (!this.activeWorksheet || !this.projectId) return;
    
    const worksheetName = this.activeWorksheet.name;
    if (!worksheetName) return;
    
    if (confirm('Are you sure you want to delete this worksheet entry?')) {
      this.afs.collection('projects').doc(this.projectId).collection(worksheetName).doc(entryId).delete()
        .then(() => {
          this.showNotification('Worksheet entry deleted successfully', 'success');
        })
        .catch((error) => {
          console.error('Error deleting worksheet entry:', error);
          this.showNotification('Error deleting worksheet entry', 'error');
        });
    }
  }

  calculateTotals(): void {
    this.totalHoursInMin = 0;
    this.totalHours = 0;
    this.costEstimate = 0;
    this.workHoursByUser = [];
    
    // Initialize work hours for all users
    this.users.forEach((element: any) => {
      element.totalhours = 0;
      let temp = {
        name: element.name,
        totalhours: 0
      };
      this.workHoursByUser.push(temp);
    });
    
    if (this.worksheetData.length > 0) {
      this.worksheetData.forEach((element: any) => {
        this.totalHoursInMin = parseFloat(this.totalHoursInMin.toString()) + parseFloat(element.time || 0);
        
        this.workHoursByUser.forEach((user: any) => {
          if (user.name === element.doneby) {
            user.totalhours = parseFloat(user.totalhours.toString()) + parseFloat(element.time || 0);
          }
        });
      });
      
      this.totalHours = this.totalHoursInMin / 60;
      this.costEstimate = this.totalHours * this.workRate;
    }
    
    console.log("Summary > ", this.workHoursByUser);
    
    // Sort by total hours (descending)
    this.workHoursByUser.sort((a: any, b: any) => {
      return b.totalhours - a.totalhours;
    });
  }

  calculateWorkHoursByUser(): void {
    // This method is now handled in calculateTotals()
    // Keeping it for backward compatibility but it's now empty
  }

  updateCost(): void {
    this.costEstimate = this.totalHours * this.workRate;
  }

  exportExcel(): void {
    if (!this.activeWorksheet || this.worksheetData.length === 0) {
      this.showNotification('No data to export', 'error');
      return;
    }

    try {
      // Prepare the data for export
      const exportData = this.prepareExcelData();
      
      // Generate and download the Excel file
      this.generateExcelFile(exportData);
      
      this.showNotification('Excel file exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      this.showNotification('Error exporting Excel file', 'error');
    }
  }

  private prepareExcelData(): any {
    const worksheetName = this.activeWorksheet.name;
    const projectName = 'Project'; // Default project name since projectInfo is not available
    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Prepare headers
    const headers = [
      'Date',
      'Task',
      'Done By',
      'Status',
      'Time (minutes)',
      'Time (hours)',
      'Remarks'
    ];

    // Prepare data rows
    const dataRows = this.worksheetData.map((entry, index) => [
      this.getCreatedDateDisplay(entry.createdAt),
      entry.task || 'N/A',
      entry.doneby || 'N/A',
      entry.status || 'N/A',
      entry.time || 0,
      ((entry.time || 0) / 60).toFixed(2),
      entry.remarks || ''
    ]);

    // Add summary rows
    const summaryRows = [
      [],
      ['SUMMARY'],
      ['Total Hours:', `${this.totalHours.toFixed(2)} hours`],
      ['Total Minutes:', `${this.totalHoursInMin} minutes`],
      ['Estimated Cost:', this.formatCurrency(this.costEstimate)],
      ['Work Rate:', `${this.workRate} per hour`],
      [],
      ['Work Hours by User:']
    ];

    // Add user summary
    this.workHoursByUser.forEach(user => {
      summaryRows.push([
        `${user.name}:`,
        `${(user.totalhours / 60).toFixed(2)} hours`,
        `${user.totalhours} minutes`
      ]);
    });

    return {
      worksheetName,
      projectName,
      exportDate,
      headers,
      dataRows,
      summaryRows
    };
  }

  private generateExcelFile(data: any): void {
    // Create CSV content (Excel can open CSV files)
    let csvContent = '';

    // Add title and metadata
    csvContent += `Project Worksheet Export\n`;
    csvContent += `Project: ${data.projectName}\n`;
    csvContent += `Worksheet: ${data.worksheetName}\n`;
    csvContent += `Export Date: ${data.exportDate}\n`;
    csvContent += `\n`;

    // Add headers
    csvContent += data.headers.join(',') + '\n';

    // Add data rows
    data.dataRows.forEach((row: any[]) => {
      csvContent += row.map(cell => this.escapeCsvValue(cell)).join(',') + '\n';
    });

    // Add summary
    data.summaryRows.forEach((row: any[]) => {
      if (row.length > 0) {
        csvContent += row.map(cell => this.escapeCsvValue(cell)).join(',') + '\n';
      } else {
        csvContent += '\n';
      }
    });

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', this.generateFileName(data));
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // If the value contains comma, quote, or newline, wrap it in quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  private generateFileName(data: any): string {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedProjectName = data.projectName.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedWorksheetName = data.worksheetName.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `worksheet_${sanitizedProjectName}_${sanitizedWorksheetName}_${date}.csv`;
  }

  worksheetChange(event: any): void {
    // Collections tab is now the last tab, so check if it's not the collections tab
    if (event.index < this.worksheetCollections.length) {
      this.selectWorksheet(this.worksheetCollections[event.index]);
    }
  }

  getCreatedDateDisplay(createdAt: any): string {
    if (!createdAt?.seconds) {
      return 'N/A';
    }
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }

  trackByWorksheet(index: number, worksheet: any): string {
    return worksheet.id;
  }

  trackByEntry(index: number, entry: any): string {
    return entry.id;
  }

  exportPdf(): void {
    if (!this.activeWorksheet || this.worksheetData.length === 0) {
      this.showNotification('No data to export', 'error');
      return;
    }

    try {
      // Prepare the data for export
      const exportData = this.preparePdfData();
      
      // Generate and download the PDF file
      this.generatePdfFile(exportData);
      
      this.showNotification('PDF file exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.showNotification('Error exporting PDF file', 'error');
    }
  }

  private preparePdfData(): any {
    const worksheetName = this.activeWorksheet.name;
    const projectName = 'Project'; // Default project name since projectInfo is not available
    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Prepare headers
    const headers = [
      'Date',
      'Task',
      'Done By',
      'Status',
      'Time (minutes)',
      'Time (hours)',
      'Remarks'
    ];

    // Prepare data rows
    const dataRows = this.worksheetData.map((entry, index) => [
      this.getCreatedDateDisplay(entry.createdAt),
      entry.task || 'N/A',
      entry.doneby || 'N/A',
      entry.status || 'N/A',
      entry.time || 0,
      ((entry.time || 0) / 60).toFixed(2),
      entry.remarks || ''
    ]);

    // Add summary rows
    const summaryRows = [
      [],
      ['SUMMARY'],
      ['Total Hours:', `${this.totalHours.toFixed(2)} hours`],
      ['Total Minutes:', `${this.totalHoursInMin} minutes`],
      ['Estimated Cost:', this.formatCurrency(this.costEstimate)],
      ['Work Rate:', `${this.workRate} per hour`],
      [],
      ['Work Hours by User:']
    ];

    // Add user summary
    this.workHoursByUser.forEach(user => {
      summaryRows.push([
        `${user.name}:`,
        `${(user.totalhours / 60).toFixed(2)} hours`,
        `${user.totalhours} minutes`
      ]);
    });

    return {
      worksheetName,
      projectName,
      exportDate,
      headers,
      dataRows,
      summaryRows
    };
  }

  private generatePdfFile(data: any): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Set font styles
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    
    // Add title
    doc.text('Project Worksheet Report', 105, 20, { align: 'center' });
    
    // Add project info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${data.projectName}`, 20, 35);
    doc.text(`Worksheet: ${data.worksheetName}`, 20, 42);
    doc.text(`Export Date: ${data.exportDate}`, 20, 49);
    
    // Add summary section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 20, 65);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Hours: ${this.totalHours.toFixed(2)} hours`, 20, 75);
    doc.text(`Total Minutes: ${this.totalHoursInMin} minutes`, 20, 82);
    doc.text(`Estimated Cost: ${this.formatCurrency(this.costEstimate)}`, 20, 89);
    doc.text(`Work Rate: ₹${this.workRate} per hour`, 20, 96);
    
    // Add work hours by user
    let yPos = 110;
    if (this.workHoursByUser.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Work Hours by User:', 20, yPos);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos = 120;
      this.workHoursByUser.forEach(user => {
        doc.text(`${user.name}: ${(user.totalhours / 60).toFixed(2)} hours (${user.totalhours} minutes)`, 25, yPos);
        yPos += 7;
      });
    }
    
    // Add worksheet data table
    if (data.dataRows.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Worksheet Entries', 20, yPos + 10);
      
      // Create table with autoTable
      autoTable(doc, {
        head: [data.headers],
        body: data.dataRows,
        startY: yPos + 20,
        theme: 'grid',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Date
          1: { cellWidth: 40 }, // Task
          2: { cellWidth: 25 }, // Done By
          3: { cellWidth: 20 }, // Status
          4: { cellWidth: 20 }, // Time (minutes)
          5: { cellWidth: 20 }, // Time (hours)
          6: { cellWidth: 'auto' } // Remarks
        },
        margin: { top: 10 }
      });
    }
    
    // Add footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Page ${i} of ${pageCount}`, 105, (doc as any).internal.pageSize.height - 10, { align: 'center' });
    }
    
    // Generate filename and save
    const fileName = this.generatePdfFileName(data);
    doc.save(fileName);
  }

  private generatePdfFileName(data: any): string {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedProjectName = data.projectName.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedWorksheetName = data.worksheetName.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `worksheet_${sanitizedProjectName}_${sanitizedWorksheetName}_${date}.pdf`;
  }
} 