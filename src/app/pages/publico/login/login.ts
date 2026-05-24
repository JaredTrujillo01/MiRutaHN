import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  error = '';
  cargando = false;

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async login() {
    this.error = '';

    if (this.loginForm.invalid) {
      this.error = 'Completa los campos correctamente.';
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    try {
      this.cargando = true;

      await this.authService.loginUsuario(email, password);

      const rol = await this.authService.getCurrentUserRole();
      localStorage.setItem('rol', rol ?? 'usuario');

      if (rol === 'admin') {
        this.router.navigate(['/admin/dashboard-admin']);
        return;
      }

      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      console.error(err);
      this.error = 'Correo o contraseña incorrectos';
    } finally {
      this.cargando = false;
    }
  }
}