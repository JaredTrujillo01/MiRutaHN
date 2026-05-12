import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-registro',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  cargando = false;
  error = '';
  exito = '';

  registroForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', Validators.required],
    ciudad: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    aceptaTerminos: [false, Validators.requiredTrue],
  });

  async registrar() {
    this.error = '';
    this.exito = '';

    if (this.registroForm.invalid) {
      this.error = 'Por favor completa todos los campos correctamente.';
      this.registroForm.markAllAsTouched();
      return;
    }

    const usuario = this.registroForm.getRawValue();

    try {
      this.cargando = true;
      await this.authService.registrarUsuario(usuario);

      this.exito = 'Cuenta creada exitosamente.';
      this.registroForm.reset();
    } catch (err: any) {
      console.error(err);
      this.error = err.message;
    } finally {
      this.cargando = false;
    }
  }
}

