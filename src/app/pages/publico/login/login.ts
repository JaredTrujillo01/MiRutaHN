import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../../services/auth';
import {
  AppAlertModal,
  AlertModalType,
} from '../../../components/app-alert-modal/app-alert-modal';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AppAlertModal],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);

  alertaVisible = signal(false);
  alertaTitulo = signal('');
  alertaMensaje = signal('');
  alertaTipo = signal<AlertModalType>('info');

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    recordarSesion: [false],
  });

  async login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();

      this.mostrarAlerta(
        'Campos incompletos',
        'Ingresa un correo válido y tu contraseña para iniciar sesión.',
        'warning'
      );

      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    try {
      this.cargando.set(true);

      await this.authService.loginUsuario(email, password);

      const rol = await this.authService.getCurrentUserRole();
      localStorage.setItem('rol', rol ?? 'usuario');

      if (rol === 'admin') {
        this.router.navigate(['/admin/dashboard-admin']);
        return;
      }

      this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error(err);

      this.mostrarAlerta(
        'No se pudo iniciar sesión',
        'El correo o la contraseña son incorrectos. Revisa tus datos e inténtalo nuevamente.',
        'error'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  mostrarAlerta(
    titulo: string,
    mensaje: string,
    tipo: AlertModalType = 'info'
  ) {
    this.alertaTitulo.set(titulo);
    this.alertaMensaje.set(mensaje);
    this.alertaTipo.set(tipo);
    this.alertaVisible.set(true);
  }

  cerrarAlerta() {
    this.alertaVisible.set(false);
  }
}