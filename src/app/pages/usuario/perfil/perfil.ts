import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { doc, Firestore, updateDoc } from '@angular/fire/firestore';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';
import {
  NotaComunitaria,
  PropuestaRuta,
  RutaService,
  RutaTransporte,
  ValidacionRuta,
} from '../../../services/ruta.service';

@Component({
  selector: 'app-perfil',
  imports: [FormsModule, RouterLink, Sidebar],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil {
  private authService = inject(AuthService);
  private rutaService = inject(RutaService);
  private firestore = inject(Firestore);
  private router = inject(Router);

  usuario = signal<any | null>(null);
  uid = signal<string | null>(null);
  rol = signal<'usuario' | 'admin'>('usuario');

  rutas = signal<RutaTransporte[]>([]);
  propuestas = signal<PropuestaRuta[]>([]);
  validaciones = signal<ValidacionRuta[]>([]);
  notas = signal<NotaComunitaria[]>([]);

  cargando = signal(true);
  editando = signal(false);
  mostrarPasswordForm = signal(false);

  mensaje = signal('');
  error = signal('');

  nombreEdit = signal('');
  telefonoEdit = signal('');
  ciudadEdit = signal('');
  avatarEdit = signal('assets/avatars/avatar-1.png');

  passwordActual = signal('');
  passwordNueva = signal('');
  passwordConfirmar = signal('');

  avatares = [
    'assets/avatars/avatar-1.png',
    'assets/avatars/avatar-2.png',
  ];

  esAdmin = computed(() => this.rol() === 'admin');

  propuestasUsuario = computed(() =>
    this.propuestas().filter((p) => p.creadoPor === this.uid()).length
  );

  propuestasAprobadasUsuario = computed(() =>
    this.propuestas().filter(
      (p) => p.creadoPor === this.uid() && p.estado === 'aprobada'
    ).length
  );

  propuestasPendientesAdmin = computed(() =>
    this.propuestas().filter((p) => p.estado === 'pendiente').length
  );

  propuestasCerradasAdmin = computed(() =>
    this.propuestas().filter((p) => p.estado !== 'pendiente').length
  );

  validacionesUsuario = computed(() =>
    this.validaciones().filter((v) => v.usuarioId === this.uid()).length
  );

  notasUsuario = computed(() =>
    this.notas().filter((n) => n.usuarioId === this.uid()).length
  );

  rutasActivas = computed(() =>
    this.rutas().filter((r) => r.estado === 'activa').length
  );

  notasActivas = computed(() =>
    this.notas().filter((n) => n.estado === 'activa').length
  );

  totalParticipacion = computed(() => {
    if (this.esAdmin()) {
      return (
        this.rutasActivas() +
        this.propuestasPendientesAdmin() +
        this.propuestasCerradasAdmin() +
        this.notasActivas()
      );
    }

    return (
      this.propuestasUsuario() +
      this.propuestasAprobadasUsuario() +
      this.validacionesUsuario() +
      this.notasUsuario()
    );
  });

  nivelCiudadano = computed(() => {
    const total = this.totalParticipacion();

    if (this.esAdmin()) return 'Supervisor del sistema';
    if (total >= 60) return 'Ciudadano experto';
    if (total >= 30) return 'Validador comunitario';
    if (total >= 10) return 'Colaborador';

    return 'Explorador';
  });

  porcentajeParticipacion = computed(() => {
    const total = this.totalParticipacion();

    if (this.esAdmin()) return Math.min(100, total * 4);

    return Math.min(100, total * 3);
  });

  actividadReciente = computed(() => {
    const uid = this.uid();

    if (!uid) return [];

    const propuestas = this.propuestas()
      .filter((p) => this.esAdmin() || p.creadoPor === uid)
      .slice(0, 3)
      .map((p) => ({
        icono: p.tipoPropuesta === 'eliminacion' ? 'report' : 'add_road',
        titulo:
          p.tipoPropuesta === 'actualizacion'
            ? 'Propuesta de actualización'
            : p.tipoPropuesta === 'eliminacion'
            ? 'Solicitud de eliminación'
            : 'Ruta propuesta',
        descripcion: `${p.nombre} · Estado: ${p.estado}`,
        fecha: this.formatearFecha(p.creadoEn),
      }));

    const notas = this.notas()
      .filter((n) => this.esAdmin() || n.usuarioId === uid)
      .slice(0, 2)
      .map((n) => ({
        icono: 'rate_review',
        titulo: 'Nota comunitaria',
        descripcion: n.comentario,
        fecha: this.formatearFecha(n.creadoEn),
      }));

    return [...propuestas, ...notas].slice(0, 5);
  });

  constructor() {
    this.cargarPerfil();
    this.cargarDatosComunitarios();
  }

  async cargarPerfil() {
    try {
      const user = await this.authService.obtenerUsuarioActual();

      if (!user) {
        this.cargando.set(false);
        this.error.set('No hay una sesión activa.');
        return;
      }

      this.uid.set(user.uid);

      const perfil = await this.authService.obtenerPerfilUsuario(user.uid);

      this.usuario.set(perfil);

      this.rol.set(
        perfil?.role === 'admin' || perfil?.rol === 'admin'
          ? 'admin'
          : 'usuario'
      );

      this.nombreEdit.set(perfil?.nombre || '');
      this.telefonoEdit.set(perfil?.telefono || '');
      this.ciudadEdit.set(perfil?.ciudad || '');
      this.avatarEdit.set(perfil?.avatarUrl || 'assets/avatars/avatar-1.png');
    } catch {
      this.error.set('No se pudo cargar el perfil.');
    } finally {
      this.cargando.set(false);
    }
  }

  cargarDatosComunitarios() {
    this.rutaService
      .getRutas()
      .pipe(takeUntilDestroyed())
      .subscribe((rutas) => this.rutas.set(rutas));

    this.rutaService
      .getPropuestasRuta()
      .pipe(takeUntilDestroyed())
      .subscribe((propuestas) => this.propuestas.set(propuestas));

    this.rutaService
      .getNotasActivas()
      .pipe(takeUntilDestroyed())
      .subscribe((notas) => this.notas.set(notas));

    this.rutaService
      .getValidacionesRuta()
      .pipe(takeUntilDestroyed())
      .subscribe((validaciones) => this.validaciones.set(validaciones));
  }

  iniciarEdicion() {
    this.editando.set(true);
    this.mensaje.set('');
    this.error.set('');
  }

  cancelarEdicion() {
    const user = this.usuario();

    this.nombreEdit.set(user?.nombre || '');
    this.telefonoEdit.set(user?.telefono || '');
    this.ciudadEdit.set(user?.ciudad || '');
    this.avatarEdit.set(user?.avatarUrl || 'assets/avatars/avatar-1.png');

    this.editando.set(false);
  }

  seleccionarAvatar(avatar: string) {
    this.avatarEdit.set(avatar);
  }

  async guardarCambios() {
    const uid = this.uid();

    if (!uid) return;

    try {
      await updateDoc(doc(this.firestore, 'usuarios', uid), {
        nombre: this.nombreEdit(),
        telefono: this.telefonoEdit(),
        ciudad: this.ciudadEdit(),
        avatarUrl: this.avatarEdit(),
      });

      this.usuario.update((actual) => ({
        ...actual,
        nombre: this.nombreEdit(),
        telefono: this.telefonoEdit(),
        ciudad: this.ciudadEdit(),
        avatarUrl: this.avatarEdit(),
      }));

      this.editando.set(false);
      this.mensaje.set('Perfil actualizado correctamente.');
    } catch {
      this.error.set('No se pudo actualizar el perfil.');
    }
  }

  abrirPasswordForm() {
    this.mostrarPasswordForm.set(true);
    this.passwordActual.set('');
    this.passwordNueva.set('');
    this.passwordConfirmar.set('');
    this.mensaje.set('');
    this.error.set('');
  }

  cerrarPasswordForm() {
    this.mostrarPasswordForm.set(false);
  }

  async cambiarPassword() {
    if (this.passwordNueva() !== this.passwordConfirmar()) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    if (this.passwordNueva().length < 6) {
      this.error.set('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      await this.authService.cambiarPassword(
        this.passwordActual(),
        this.passwordNueva()
      );

      this.mostrarPasswordForm.set(false);
      this.mensaje.set('Contraseña actualizada correctamente.');
    } catch {
      this.error.set('No se pudo cambiar la contraseña.');
    }
  }

  async cerrarSesion() {
    await this.authService.cerrarSesion();
    this.router.navigate(['/dashboard']);
  }

  formatearFecha(fecha: any) {
    if (!fecha) return 'Sin fecha';

    const fechaFinal =
      typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha);

    return fechaFinal.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}