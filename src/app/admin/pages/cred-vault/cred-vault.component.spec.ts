import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';

import { CredVaultComponent } from './cred-vault.component';

describe('CredVaultComponent', () => {
  let component: CredVaultComponent;
  let fixture: ComponentFixture<CredVaultComponent>;

  const mockFirebaseConfig = {
    apiKey: 'test-api-key',
    authDomain: 'test-domain.firebaseapp.com',
    projectId: 'test-project-id',
    storageBucket: 'test-bucket.appspot.com',
    messagingSenderId: '123456789',
    appId: 'test-app-id'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CredVaultComponent ],
      imports: [
        ReactiveFormsModule,
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        BrowserAnimationsModule,
        ClipboardModule,
        AngularFireModule.initializeApp(mockFirebaseConfig),
        AngularFirestoreModule,
        AngularFireAuthModule
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CredVaultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.isAddingCredential).toBeFalsy();
    expect(component.isEditing).toBeFalsy();
    expect(component.passwordVisible).toBeFalsy();
    expect(component.searchTerm).toBe('');
    expect(component.selectedCategory).toBe('all');
    expect(component.isLoading).toBeFalsy();
  });

  it('should have correct categories', () => {
    expect(component.categories).toContain('Social Media');
    expect(component.categories).toContain('Email');
    expect(component.categories).toContain('Banking');
    expect(component.categories).toContain('Shopping');
    expect(component.categories).toContain('Work');
    expect(component.categories).toContain('Personal');
    expect(component.categories).toContain('Development');
    expect(component.categories).toContain('Other');
  });

  it('should create form with required controls', () => {
    expect(component.credentialForm.get('name')).toBeTruthy();
    expect(component.credentialForm.get('username')).toBeTruthy();
    expect(component.credentialForm.get('password')).toBeTruthy();
    expect(component.credentialForm.get('category')).toBeTruthy();
    expect(component.credentialForm.get('description')).toBeTruthy();
    expect(component.credentialForm.get('url')).toBeTruthy();
    expect(component.credentialForm.get('isActive')).toBeTruthy();
  });

  it('should have correct form validation', () => {
    const form = component.credentialForm;
    
    // Test required fields
    expect(form.get('name')?.hasError('required')).toBeTruthy();
    expect(form.get('username')?.hasError('required')).toBeTruthy();
    expect(form.get('password')?.hasError('required')).toBeTruthy();
    expect(form.get('category')?.hasError('required')).toBeFalsy(); // Has default value
    
    // Test min length validation
    form.patchValue({ name: 'a' });
    expect(form.get('name')?.hasError('minlength')).toBeTruthy();
    
    form.patchValue({ username: 'a' });
    expect(form.get('username')?.hasError('minlength')).toBeTruthy();
    
    form.patchValue({ password: '12345' });
    expect(form.get('password')?.hasError('minlength')).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    expect(component.passwordVisible).toBeFalsy();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeTruthy();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeFalsy();
  });

  it('should generate password', () => {
    const initialPassword = component.credentialForm.get('password')?.value;
    component.generatePassword();
    const generatedPassword = component.credentialForm.get('password')?.value;
    
    expect(generatedPassword).toBeTruthy();
    expect(generatedPassword.length).toBe(16);
    expect(generatedPassword).not.toBe(initialPassword);
  });

  it('should reset form correctly', () => {
    component.credentialForm.patchValue({
      name: 'Test Credential',
      username: 'testuser',
      password: 'testpass',
      category: 'Work',
      description: 'Test description',
      url: 'https://test.com',
      isActive: false
    });
    
    component.isAddingCredential = true;
    component.isEditing = true;
    component.editingCredentialId = 'test-id';
    component.passwordVisible = true;
    
    component.resetForm();
    
    expect(component.isAddingCredential).toBeFalsy();
    expect(component.isEditing).toBeFalsy();
    expect(component.editingCredentialId).toBeNull();
    expect(component.passwordVisible).toBeFalsy();
    expect(component.credentialForm.get('name')?.value).toBe('');
    expect(component.credentialForm.get('category')?.value).toBe('Other');
    expect(component.credentialForm.get('isActive')?.value).toBeTruthy();
  });

  it('should get correct category colors', () => {
    expect(component.getCategoryColor('Social Media')).toBe('#3b82f6');
    expect(component.getCategoryColor('Email')).toBe('#8b5cf6');
    expect(component.getCategoryColor('Banking')).toBe('#ef4444');
    expect(component.getCategoryColor('Shopping')).toBe('#f59e0b');
    expect(component.getCategoryColor('Work')).toBe('#10b981');
    expect(component.getCategoryColor('Personal')).toBe('#06b6d4');
    expect(component.getCategoryColor('Development')).toBe('#84cc16');
    expect(component.getCategoryColor('Other')).toBe('#6b7280');
    expect(component.getCategoryColor('Unknown')).toBe('#6b7280');
  });

  it('should apply filter correctly', () => {
    const mockCredentials = [
      { name: 'Test1', username: 'user1', category: 'Work', description: 'Test desc' },
      { name: 'Test2', username: 'user2', category: 'Personal', description: 'Another desc' },
      { name: 'Email', username: 'emailuser', category: 'Email', description: 'Email desc' }
    ];
    
    component.credentials = mockCredentials;
    component.dataSource.data = mockCredentials;
    
    // Test search filter
    component.searchTerm = 'Test1';
    component.applyFilter();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].name).toBe('Test1');
    
    // Test category filter
    component.searchTerm = '';
    component.selectedCategory = 'Email';
    component.applyFilter();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].category).toBe('Email');
    
    // Test combined filter
    component.searchTerm = 'Test';
    component.selectedCategory = 'Work';
    component.applyFilter();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].name).toBe('Test1');
  });

  it('should mark form group as touched', () => {
    const form = component.credentialForm;
    component.markFormGroupTouched();
    
    expect(form.get('name')?.touched).toBeTruthy();
    expect(form.get('username')?.touched).toBeTruthy();
    expect(form.get('password')?.touched).toBeTruthy();
    expect(form.get('category')?.touched).toBeTruthy();
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toContain('name');
    expect(component.displayedColumns).toContain('username');
    expect(component.displayedColumns).toContain('password');
    expect(component.displayedColumns).toContain('category');
    expect(component.displayedColumns).toContain('status');
    expect(component.displayedColumns).toContain('actions');
  });
}); 