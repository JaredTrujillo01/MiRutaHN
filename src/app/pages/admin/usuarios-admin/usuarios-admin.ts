import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';
import {
  EstadoUsuario,
  PerfilUsuario,
  UsuarioService,
  UserRole,
} from '../../../services/usuario.service';

@Component({
  selector: 'app-usuarios-admin',
  imports: [FormsModule, Sidebar],
  templateUrl: './usuarios-admin.html',
  styleUrl: './usuarios-admin.scss',
})
export class UsuariosAdmin {
  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);

  usuarios = signal<PerfilUsuario[]>([]);
  cargando = signal(true);
  error = signal('');
  mensaje = signal('');
  filtro = signal('');
  rolFiltro = signal<UserRole | 'todos'>('todos');
  estadoFiltro = signal<EstadoUsuario | 'todos'>('todos');
  actualizando = signal<string | null>(null);
  adminId = signal<string | null>(null);

  usuariosFiltrados = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const rol = this.rolFiltro();
    const estado = this.estadoFiltro();

    return this.usuarios().filter((usuario) => {
      const role = this.rolUsuario(usuario);
      const estadoActual = this.estadoUsuario(usuario);
      const coincideRol = rol === 'todos' || role === rol;
      const coincideEstado = estado === 'todos' || estadoActual === estado;
      const coincideTexto = !texto || [
        usuario.nombre,
        usuario.email,
        usuario.telefono,
        usuario.ciudad,
        role,
        estadoActual,
        usuario.motivoSuspension,
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto);

      return coincideRol && coincideEstado && coincideTexto;
    });
  });

  constructor() {
    this.cargarAdminActual();

    this.usuarioService
      .getUsuarios()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (usuarios) => {
          this.usuarios.set(usuarios);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los usuarios.');
          this.cargando.set(false);
        },
      });
  }

  async cargarAdminActual() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.adminId.set(usuario?.uid ?? null);
  }

  actualizarFiltro(valor: string) {
    this.filtro.set(valor);
  }

  actualizarRolFiltro(valor: string) {
    this.rolFiltro.set(valor as UserRole | 'todos');
  }

  actualizarEstadoFiltro(valor: string) {
    this.estadoFiltro.set(valor as EstadoUsuario | 'todos');
  }

  rolUsuario(usuario: PerfilUsuario): UserRole {
    return this.usuarioService.normalizarRol(usuario.role ?? usuario.rol);
  }

  estadoUsuario(usuario: PerfilUsuario): EstadoUsuario {
    return this.usuarioService.estadoUsuarioActual(usuario);
  }

  estadoUsuarioTexto(usuario: PerfilUsuario) {
    const estado = this.estadoUsuario(usuario);

    if (estado === 'suspendido_temporal') return 'Suspendido temporalmente';
    if (estado === 'suspendido_permanente') return 'Suspendido permanentemente';
    return 'Activo';
  }

  async cambiarRol(usuario: PerfilUsuario, rol: UserRole) {
    if (!usuario.uid || this.rolUsuario(usuario) === rol) return;

    this.actualizando.set(usuario.uid);

    try {
      await this.usuarioService.actualizarRol(usuario.uid, rol);
    } finally {
      this.actualizando.set(null);
    }
  }

  totalPorRol(rol: UserRole) {
    return this.usuarios().filter((usuario) => this.rolUsuario(usuario) === rol).length;
  }

  totalPorEstado(estado: EstadoUsuario) {
    return this.usuarios().filter((usuario) => this.estadoUsuario(usuario) === estado).length;
  }

  async suspenderTemporalmente(usuario: PerfilUsuario) {
    if (!this.puedeModificar(usuario)) return;

    const motivo = window.prompt(
      `Motivo para suspender temporalmente a ${usuario.nombre || usuario.email}:`
    )?.trim();

    if (!motivo) return;

    const diasTexto = window.prompt(
      'Cantidad de dias de suspension temporal:',
      '7'
    )?.trim();
    const dias = Number(diasTexto);

    if (!Number.isFinite(dias) || dias <= 0) {
      this.error.set('Ingresa una cantidad valida de dias para la suspension.');
      return;
    }

    const suspensionHasta = new Date();
    suspensionHasta.setDate(suspensionHasta.getDate() + Math.ceil(dias));

    const confirmado = window.confirm(
      `Suspender temporalmente a ${usuario.nombre || usuario.email} hasta ${this.formatearFecha(suspensionHasta)}?`
    );

    if (!confirmado) return;

    await this.ejecutarAccionUsuario(usuario, () =>
      this.usuarioService.suspenderTemporalmente(
        usuario,
        this.adminId()!,
        motivo,
        suspensionHasta
      ),
      'Usuario suspendido temporalmente.'
    );
  }

  async suspenderPermanentemente(usuario: PerfilUsuario) {
    if (!this.puedeModificar(usuario)) return;

    const motivo = window.prompt(
      `Motivo para suspender permanentemente a ${usuario.nombre || usuario.email}:`
    )?.trim();

    if (!motivo) return;

    const confirmado = window.confirm(
      `Suspender permanentemente a ${usuario.nombre || usuario.email}? Esta accion no elimina su historial.`
    );

    if (!confirmado) return;

    await this.ejecutarAccionUsuario(usuario, () =>
      this.usuarioService.suspenderPermanentemente(
        usuario,
        this.adminId()!,
        motivo
      ),
      'Usuario suspendido permanentemente.'
    );
  }

  async reactivarUsuario(usuario: PerfilUsuario) {
    if (!this.puedeModificar(usuario)) return;

    const confirmado = window.confirm(
      `Reactivar a ${usuario.nombre || usuario.email}? Su rol actual se conservara.`
    );

    if (!confirmado) return;

    await this.ejecutarAccionUsuario(usuario, () =>
      this.usuarioService.reactivarUsuario(usuario, this.adminId()!),
      'Usuario reactivado correctamente.'
    );
  }

  formatearFecha(fecha: any) {
    if (!fecha) return 'Sin fecha';

    const fechaFinal =
      typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha);

    if (Number.isNaN(fechaFinal.getTime())) {
      return 'Sin fecha';
    }

    return fechaFinal.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private puedeModificar(usuario: PerfilUsuario) {
    this.error.set('');
    this.mensaje.set('');

    if (!this.adminId()) {
      this.error.set('No se pudo confirmar la sesion administrativa.');
      return false;
    }

    if (usuario.uid === this.adminId()) {
      this.error.set('No puedes suspender o reactivar tu propia cuenta desde esta pantalla.');
      return false;
    }

    return true;
  }

  private async ejecutarAccionUsuario(
    usuario: PerfilUsuario,
    accion: () => Promise<unknown>,
    mensaje: string
  ) {
    this.actualizando.set(usuario.uid);

    try {
      await accion();
      this.mensaje.set(mensaje);
    } catch (error) {
      console.error(error);
      this.error.set('No se pudo actualizar el estado del usuario.');
    } finally {
      this.actualizando.set(null);
    }
  }
}
