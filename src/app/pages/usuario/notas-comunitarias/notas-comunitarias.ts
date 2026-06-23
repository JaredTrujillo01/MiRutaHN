import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';

import { AppAlertModal, AlertModalType } from '../../../components/app-alert-modal/app-alert-modal';
import { AuthRequiredModal } from '../../../components/auth-required-modal/auth-required-modal';
import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';
import {
  AccionNota,
  NotaComunitaria,
  RutaService,
  RutaTransporte,
  TipoAccionNota,
} from '../../../services/ruta.service';

@Component({
  selector: 'app-notas-comunitarias',
  imports: [FormsModule, Sidebar, AuthRequiredModal, AppAlertModal],
  templateUrl: './notas-comunitarias.html',
  styleUrl: './notas-comunitarias.scss',
})
export class NotasComunitarias {
  private rutaService = inject(RutaService);
  private authService = inject(AuthService);

  rutas = signal<RutaTransporte[]>([]);
  notas = signal<NotaComunitaria[]>([]);
  accionesUsuario = signal<AccionNota[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  esAdmin = signal(false);
  rolCargado = signal(false);
  filtro = signal('');
  mensaje = signal('');
  error = signal('');
  intentoCrearNota = signal(false);

  mostrarModalAuth = signal(false);
  alertaVisible = signal(false);
  alertaTitulo = signal('');
  alertaMensaje = signal('');
  alertaTipo = signal<AlertModalType>('info');

  usuarioAuth: Awaited<ReturnType<AuthService['obtenerUsuarioActual']>> = null;
  usuarioPerfil: any = null;

  nuevaNota = signal({
    rutaId: '',
    campoMarcado: 'otro' as NonNullable<NotaComunitaria['campoMarcado']>,
    comentario: '',
  });

  constructor() {
    this.cargarUsuario();
    this.cargarDatos();
  }

  async cargarUsuario() {
    try {
      this.usuarioAuth = await this.authService.obtenerUsuarioActual();

      if (this.usuarioAuth) {
        this.usuarioPerfil = await this.authService.obtenerPerfilUsuario(
          this.usuarioAuth.uid
        );
        this.cargarAccionesUsuario(this.usuarioAuth.uid);
      }

      this.esAdmin.set(await this.authService.isAdmin());
    } finally {
      this.rolCargado.set(true);
    }
  }

  cargarDatos() {
    this.cargando.set(true);

    this.rutaService.getRutas().subscribe({
      next: (rutas) => {
        this.rutas.set(rutas.filter((ruta) => ruta.estado === 'activa'));
      },
      error: (err) => console.error(err),
    });

    this.rutaService.getNotasActivas().subscribe({
      next: (notas) => {
        this.notas.set(notas);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.cargando.set(false);
      },
    });
  }

  actualizarNotaCampo(
    campo: 'rutaId' | 'campoMarcado' | 'comentario',
    valor: string
  ) {
    this.nuevaNota.update((nota) => ({
      ...nota,
      [campo]: valor,
    }));
  }

  async crearNota() {
    const nota = this.nuevaNota();
    this.intentoCrearNota.set(true);
    this.mensaje.set('');
    this.error.set('');

    if (!(await this.puedeParticipar())) return;

    if (!nota.rutaId || !nota.comentario.trim()) {
      this.error.set('Selecciona una ruta y escribe la observacion.');
      return;
    }

    this.guardando.set(true);

    try {
      await this.rutaService.createNotaComunitaria({
        rutaId: nota.rutaId,
        usuarioId: this.usuarioAuth!.uid,
        usuarioNombre:
          this.usuarioPerfil?.nombre || this.usuarioAuth!.email || 'Ciudadano',
        comentario: nota.comentario.trim(),
        campoMarcado: nota.campoMarcado,
        estado: 'activa',
        votosUtiles: 0,
        confirmaciones: 0,
        creadoEn: Timestamp.now(),
      });

      this.nuevaNota.set({
        rutaId: '',
        campoMarcado: 'otro',
        comentario: '',
      });
      this.intentoCrearNota.set(false);
      this.mostrarAlerta(
        'Nota agregada',
        'Tu nota comunitaria se agrego correctamente.',
        'success'
      );
    } catch (err) {
      console.error(err);
      this.mostrarAlerta(
        'No se pudo agregar',
        'No se pudo guardar la nota comunitaria.',
        'error'
      );
    } finally {
      this.guardando.set(false);
    }
  }

  async votarNota(id?: string) {
    if (!id || !(await this.puedeParticipar())) return;

    try {
      await this.rutaService.votarNotaUtil(id, this.usuarioAuth!.uid);
      this.mensaje.set('Voto util registrado.');
      this.error.set('');
    } catch (err: any) {
      console.error(err);
      this.mostrarAlerta(
        'No se pudo votar',
        err?.message || 'No se pudo registrar el voto.',
        'warning'
      );
    }
  }

  async confirmarNota(id?: string) {
    if (!id || !(await this.puedeParticipar())) return;

    try {
      await this.rutaService.confirmarNota(id, this.usuarioAuth!.uid);
      this.mensaje.set('Confirmacion de nota registrada.');
      this.error.set('');
    } catch (err: any) {
      console.error(err);
      this.mostrarAlerta(
        'No se pudo confirmar',
        err?.message || 'No se pudo confirmar la nota.',
        'warning'
      );
    }
  }

  async resolverNota(id?: string) {
    if (!this.esAdmin() || !id) return;

    try {
      await this.rutaService.resolverNotaComunitaria(id);
      this.mensaje.set('Nota resuelta y ocultada correctamente.');
      this.error.set('');
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo resolver la nota.');
    }
  }

  notasFiltradas() {
    const filtro = this.filtro().trim().toLowerCase();

    if (!filtro) return this.notas();

    return this.notas().filter((nota) =>
      [
        nota.comentario,
        nota.campoMarcado,
        nota.usuarioNombre,
        this.nombreRuta(nota.rutaId),
      ]
        .join(' ')
        .toLowerCase()
        .includes(filtro)
    );
  }

  nombreRuta(rutaId: string) {
    const ruta = this.rutas().find((item) => item.id === rutaId);
    return ruta ? `${ruta.nombre} - Ruta ${ruta.numero}` : 'Ruta aprobada';
  }

  formatearFecha(timestamp?: Timestamp) {
    if (!timestamp) return '';

    return timestamp.toDate().toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  accionRealizada(notaId: string | undefined, tipo: TipoAccionNota) {
    if (!notaId || !this.usuarioAuth) return false;

    return this.accionesUsuario().some(
      (accion) => accion.notaId === notaId && accion.tipo === tipo
    );
  }

  cerrarModalAuth() {
    this.mostrarModalAuth.set(false);
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

  rutaNotaInvalida() {
    return this.intentoCrearNota() && !this.nuevaNota().rutaId;
  }

  comentarioNotaInvalido() {
    return this.intentoCrearNota() && !this.nuevaNota().comentario.trim();
  }

  private cargarAccionesUsuario(usuarioId: string) {
    this.rutaService.getAccionesNotasUsuario(usuarioId).subscribe({
      next: (acciones) => this.accionesUsuario.set(acciones),
      error: (err) => console.error(err),
    });
  }

  private async puedeParticipar() {
    if (!this.usuarioAuth) {
      this.usuarioAuth = await this.authService.obtenerUsuarioActual();

      if (!this.usuarioAuth) {
        this.mostrarModalAuth.set(true);
        return false;
      }

      this.usuarioPerfil = await this.authService.obtenerPerfilUsuario(
        this.usuarioAuth.uid
      );
      this.cargarAccionesUsuario(this.usuarioAuth.uid);
    }

    const perfil =
      this.usuarioPerfil ||
      (await this.authService.obtenerPerfilUsuario(this.usuarioAuth.uid));

    const esAdministrador =
      perfil?.role === 'admin' || perfil?.rol === 'admin';

    if (esAdministrador) {
      this.esAdmin.set(true);
      return false;
    }

    if (this.authService.estaUsuarioSuspendido(perfil)) {
      this.mostrarAlerta(
        'Participacion suspendida',
        this.authService.mensajeSuspension(perfil),
        'warning'
      );
      return false;
    }

    return true;
  }
}
