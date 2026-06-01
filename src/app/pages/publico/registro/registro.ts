import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { AuthService } from '../../../services/auth';
import {
  AppAlertModal,
  AlertModalType,
} from '../../../components/app-alert-modal/app-alert-modal';

@Component({
  selector: 'app-registro',
  imports: [RouterLink, ReactiveFormsModule, AppAlertModal],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);

  alertaVisible = signal(false);
  alertaTitulo = signal('');
  alertaMensaje = signal('');
  alertaTipo = signal<AlertModalType>('info');

  registroForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', Validators.required],
    ciudad: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    aceptaTerminos: [false, Validators.requiredTrue],
  });

  async registrar() {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();

      this.mostrarAlerta(
        'Campos incompletos',
        'Completa todos los campos, acepta los términos y usa una contraseña de al menos 6 caracteres.',
        'warning'
      );

      return;
    }

    const usuario = this.registroForm.getRawValue();

    try {
      this.cargando.set(true);

      await this.authService.registrarUsuario(usuario);

      this.mostrarAlerta(
        'Cuenta creada',
        'Tu cuenta fue creada correctamente. Ahora puedes iniciar sesión.',
        'success'
      );

      this.registroForm.reset();
    } catch (err: any) {
      console.error(err);

      this.mostrarAlerta(
        'No se pudo crear la cuenta',
        this.obtenerMensajeError(err?.code || err?.message),
        'error'
      );
    } finally {
      this.cargando.set(false);
    }
  }

  irLogin() {
    this.router.navigate(['/login']);
  }

  obtenerMensajeError(error: string) {
    if (error.includes('email-already-in-use')) {
      return 'Este correo ya está registrado. Intenta iniciar sesión.';
    }

    if (error.includes('invalid-email')) {
      return 'El correo electrónico no tiene un formato válido.';
    }

    if (error.includes('weak-password')) {
      return 'La contraseña es muy débil. Usa al menos 6 caracteres.';
    }

    return 'Ocurrió un error al crear la cuenta. Inténtalo nuevamente.';
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

    if (this.alertaTipo() === 'success') {
      this.router.navigate(['/login']);
    }
  }
}