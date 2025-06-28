import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /** Toggle between password/text input */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /** Standard email/password login */
  async login(): Promise<void> {
    this.errorMessage = '';
    this.isLoading = true;
    try {
      await this.authService.login(this.email, this.password);
      
      // navigate to the protected area on success
      // this.router.navigate(['/admin']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Login failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /** Google OAuth login (simulated) */
  async loginWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.isLoading = true;
    try {
      // Uncomment and implement real Google login if available:
      // await this.authService.loginWithGoogle();
      // this.router.navigate(['/dashboard']);
      await new Promise(res => setTimeout(res, 1000)); // Simulate loading
    } catch (error: any) {
      this.errorMessage = error.message || 'Google login failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

}