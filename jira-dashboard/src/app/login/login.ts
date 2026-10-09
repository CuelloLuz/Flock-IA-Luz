import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl:    './login.scss',
})
export class Login {
  user     = '';
  password = '';
  error    = signal(false);
  showPass = signal(false);

  constructor(private router: Router) {}

  submit(): void {
    if (
      this.user.trim()     === environment.auth.user &&
      this.password        === environment.auth.password
    ) {
      sessionStorage.setItem('auth', '1');
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set(true);
    }
  }

  clearError(): void { this.error.set(false); }
}
