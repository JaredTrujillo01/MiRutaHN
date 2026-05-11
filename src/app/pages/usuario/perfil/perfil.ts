import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'app-perfil',
  imports: [FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil implements OnInit {
  private usuarioService = inject(UsuarioService);

  usuario: Usuario | null = null;
  editando = false;
  nombreEdit = '';
  cargando = false;
  mensaje = '';
  error = '';

  private uidPrueba = 'user_prueba_001';

  async ngOnInit() {
    await this.cargarUsuario();
  }

  async cargarUsuario() {
    this.cargando = true;
    try {
      this.usuario = await this.usuarioService.obtenerUsuario(this.uidPrueba);

      if (!this.usuario) {
        await this.usuarioService.crearUsuario({
          uid: this.uidPrueba,
          nombre: 'Usuario de Prueba',
          email: 'prueba@mirutahn.com',
          rol: 'usuario',
          fechaRegistro: new Date(),
          rutasFavoritas: []
        });
        this.usuario = await this.usuarioService.obtenerUsuario(this.uidPrueba);
      }
    } catch (e) {
      this.error = 'Error al cargar perfil.';
    } finally {
      this.cargando = false;
    }
  }

  iniciarEdicion() {
    this.nombreEdit = this.usuario?.nombre ?? '';
    this.editando = true;
    this.mensaje = '';
  }

  async guardarCambios() {
    if (!this.nombreEdit.trim()) return;
    this.cargando = true;
    this.mensaje = '';
    try {
      await this.usuarioService.actualizarUsuario(this.uidPrueba, { nombre: this.nombreEdit });
      if (this.usuario) this.usuario.nombre = this.nombreEdit;
      this.editando = false;
      this.mensaje = 'Perfil actualizado correctamente.';
    } catch (e) {
      this.error = 'Error al actualizar.';
    } finally {
      this.cargando = false;
    }
  }

  cancelarEdicion() {
    this.editando = false;
    this.nombreEdit = '';
  }

  async eliminarCuenta() {
    if (!confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
    try {
      await this.usuarioService.eliminarUsuario(this.uidPrueba);
      this.usuario = null;
      this.mensaje = 'Cuenta eliminada.';
    } catch (e) {
      this.error = 'Error al eliminar cuenta.';
    }
  }
}
