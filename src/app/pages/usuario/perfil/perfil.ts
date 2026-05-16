import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { doc, Firestore, updateDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-perfil',
  imports: [FormsModule, Sidebar],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil implements OnInit {
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);

  usuario = signal<any | null>(null);
  cargando = signal<boolean>(true);
  editando = signal<boolean>(false);
  mostrarPasswordForm = signal<boolean>(false);

  uid = '';

  mensaje = '';
  error = '';

  nombreEdit = '';
  telefonoEdit = '';
  ciudadEdit = '';
  avatarEdit = '';

  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';

  avatares = [
    'assets/avatars/avatar-1.png',
    'assets/avatars/avatar-2.png',
  ];

  ngOnInit() {
    this.cargarUsuario();
  }

  async cargarUsuario() {
    this.cargando.set(true);
    this.error = '';
    this.mensaje = '';

    try {
      const usuarioAuth = await this.authService.obtenerUsuarioActual();

      if (!usuarioAuth) {
        this.error = 'No hay una sesión activa.';
        this.usuario.set(null);
        return;
      }

      this.uid = usuarioAuth.uid;

      const perfil = await this.authService.obtenerPerfilUsuario(usuarioAuth.uid);

      if (!perfil) {
        this.error = 'No se encontró el perfil en la base de datos.';
        this.usuario.set(null);
        return;
      }

      this.usuario.set(perfil);

      this.nombreEdit = perfil['nombre'] || '';
      this.telefonoEdit = perfil['telefono'] || '';
      this.ciudadEdit = perfil['ciudad'] || '';
      this.avatarEdit = perfil['avatarUrl'] || 'assets/avatars/avatar-1.png';
    } catch (e) {
      console.error('ERROR PERFIL:', e);
      this.error = 'Error al cargar perfil.';
    } finally {
      this.cargando.set(false);
    }
  }

  iniciarEdicion() {
    const user = this.usuario();

    this.editando.set(true);
    this.mostrarPasswordForm.set(false);
    this.mensaje = '';
    this.error = '';

    this.nombreEdit = user?.nombre || '';
    this.telefonoEdit = user?.telefono || '';
    this.ciudadEdit = user?.ciudad || '';
    this.avatarEdit = user?.avatarUrl || 'assets/avatars/avatar-1.png';
  }

  cancelarEdicion() {
    this.editando.set(false);
    this.mensaje = '';
    this.error = '';
  }

  seleccionarAvatar(avatar: string) {
    this.avatarEdit = avatar;
  }

  async guardarCambios() {
    if (!this.nombreEdit.trim()) {
      this.error = 'El nombre no puede estar vacío.';
      return;
    }

    this.cargando.set(true);
    this.mensaje = '';
    this.error = '';

    try {
      await updateDoc(doc(this.firestore, 'usuarios', this.uid), {
        nombre: this.nombreEdit,
        telefono: this.telefonoEdit,
        ciudad: this.ciudadEdit,
        avatarUrl: this.avatarEdit,
      });

      await this.cargarUsuario();
      this.editando.set(false);
      this.mensaje = 'Perfil actualizado correctamente.';
    } catch (e) {
      console.error('ERROR ACTUALIZAR PERFIL:', e);
      this.error = 'Error al actualizar perfil.';
    } finally {
      this.cargando.set(false);
    }
  }

  abrirPasswordForm() {
    this.mostrarPasswordForm.set(true);
    this.editando.set(false);
    this.passwordActual = '';
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.mensaje = '';
    this.error = '';
  }

  cerrarPasswordForm() {
    this.mostrarPasswordForm.set(false);
    this.passwordActual = '';
    this.passwordNueva = '';
    this.passwordConfirmar = '';
  }

  async cambiarPassword() {
    this.mensaje = '';
    this.error = '';

    if (
      !this.passwordActual.trim() ||
      !this.passwordNueva.trim() ||
      !this.passwordConfirmar.trim()
    ) {
      this.error = 'Completa todos los campos de contraseña.';
      return;
    }

    if (this.passwordNueva.length < 6) {
      this.error = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.passwordNueva !== this.passwordConfirmar) {
      this.error = 'Las contraseñas nuevas no coinciden.';
      return;
    }

    this.cargando.set(true);

    try {
      await this.authService.cambiarPassword(
        this.passwordActual,
        this.passwordNueva
      );

      this.mensaje = 'Contraseña actualizada correctamente.';
      this.cerrarPasswordForm();
    } catch (e) {
      console.error('ERROR CAMBIAR CONTRASEÑA:', e);
      this.error =
        'No se pudo cambiar la contraseña. Verifica tu contraseña actual.';
    } finally {
      this.cargando.set(false);
    }
  }

  async cerrarSesion() {
    await this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }
}