import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-registro',
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);

  nombre = '';
  email = '';
  password = '';
  telefono = '';
  cargando = false;
  error = '';
  exito = '';

  async registrar() {
    if (!this.nombre || !this.email || !this.password) {
      this.error = 'Por favor completa todos los campos.';
      return;
    }

    this.cargando = true;
    this.error = '';

    try {
      const uid = 'user_' + Date.now();
      await this.usuarioService.crearUsuario({
        uid,
        nombre: this.nombre,
        email: this.email,
        telefono: this.telefono,
        rol: 'usuario',
        fechaRegistro: new Date(),
        rutasFavoritas: []
      });
      this.exito = '¡Cuenta creada exitosamente!';
      setTimeout(() => this.router.navigate(['/login']), 1500);
    } catch (err: any) {
      this.error = 'Error al crear la cuenta. Intenta de nuevo.';
      console.error(err);
    } finally {
      this.cargando = false;
    }
  }
}
