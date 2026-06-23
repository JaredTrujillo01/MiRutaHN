import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';

import { AuthService } from '../../services/auth';
import { NotaComunitaria, RutaService } from '../../services/ruta.service';
import { AuthRequiredModal } from '../auth-required-modal/auth-required-modal';

@Component({
  selector: 'app-detalle-ruta',
  imports: [FormsModule, AuthRequiredModal],
  templateUrl: './detalle-ruta.html',
  styleUrl: './detalle-ruta.scss',
})
export class DetalleRuta {
  private rutaService = inject(RutaService);
  private authService = inject(AuthService);

  ruta = input<any | null>(null);
  volver = output<void>();

  notas = signal<NotaComunitaria[]>([]);
  mostrarModalAuth = signal(false);
  mensaje = signal('');
  error = signal('');
  intentoCrearNota = signal(false);

  nuevaNota = signal({
    campoMarcado: 'otro' as NonNullable<NotaComunitaria['campoMarcado']>,
    comentario: '',
  });

  constructor() {
    effect(() => {
      const rutaActual = this.ruta();

      if (!rutaActual?.id) {
        this.notas.set([]);
        return;
      }

      this.rutaService.getNotasPorRuta(String(rutaActual.id)).subscribe((notas) => {
        this.notas.set(notas.filter((nota) => this.esNotaDeHoy(nota.creadoEn)));
      });
    });
  }

  esNotaDeHoy(fecha: any) {
    if (!fecha) return false;

    const fechaNota =
      typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha);

    const hoy = new Date();

    return (
      fechaNota.getFullYear() === hoy.getFullYear() &&
      fechaNota.getMonth() === hoy.getMonth() &&
      fechaNota.getDate() === hoy.getDate()
    );
  }

  tituloRuta() {
    const rutaActual = this.ruta();
    if (!rutaActual) return 'Ruta seleccionada';

    return rutaActual.numero
      ? `Ruta ${rutaActual.numero}: ${rutaActual.nombre}`
      : rutaActual.nombre;
  }

  precioRuta() {
    const precio = this.ruta()?.precio;
    return precio ? `L. ${precio}` : 'No definido';
  }

  frecuenciaRuta() {
    return this.ruta()?.frecuencia || 'No definida';
  }

  horarioRuta() {
    return this.ruta()?.horario || 'No definido';
  }

  paradasRuta() {
    return this.ruta()?.paradas || [];
  }

  actualizarNotaCampo(campo: 'campoMarcado' | 'comentario', valor: string) {
    this.nuevaNota.update((nota) => ({
      ...nota,
      [campo]: valor,
    }));
  }

  async requiereSesion() {
    const usuario = await this.authService.obtenerUsuarioActual();

    if (!usuario) {
      this.mostrarModalAuth.set(true);
      return null;
    }

    const perfil = await this.authService.obtenerPerfilUsuario(usuario.uid);

    if (this.authService.estaUsuarioSuspendido(perfil)) {
      this.error.set(this.authService.mensajeSuspension(perfil));
      window.alert(this.authService.mensajeSuspension(perfil));
      return null;
    }

    return usuario;
  }

  cerrarModalAuth() {
    this.mostrarModalAuth.set(false);
  }

  async crearNota() {
    const rutaActual = this.ruta();
    const nota = this.nuevaNota();
    this.intentoCrearNota.set(true);
    this.mensaje.set('');
    this.error.set('');
    const usuarioAuth = await this.requiereSesion();

    if (!usuarioAuth || !rutaActual?.id) return;

    if (!nota.comentario.trim()) {
      this.error.set('Escribe un comentario antes de agregar la nota.');
      return;
    }

    const perfil = await this.authService.obtenerPerfilUsuario(usuarioAuth.uid);

    try {
      await this.rutaService.createNotaComunitaria({
        rutaId: String(rutaActual.id),
        usuarioId: usuarioAuth.uid,
        usuarioNombre: perfil?.nombre || usuarioAuth.email || 'Ciudadano',
        comentario: nota.comentario,
        campoMarcado: nota.campoMarcado,
        estado: 'activa',
        votosUtiles: 0,
        confirmaciones: 0,
        creadoEn: Timestamp.now(),
      });

      this.nuevaNota.set({
        campoMarcado: 'otro',
        comentario: '',
      });
      this.intentoCrearNota.set(false);
      this.mensaje.set('Nota comunitaria agregada a la ruta.');
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo agregar la nota comunitaria.');
    }
  }

  async votarNota(id?: string) {
    if (!id) return;

    const usuario = await this.requiereSesion();
    if (!usuario) return;

    try {
      await this.rutaService.votarNotaUtil(id, usuario.uid);
      this.mensaje.set('Voto útil registrado para la nota.');
      this.error.set('');
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo registrar el voto.');
    }
  }

  async confirmarNota(id?: string) {
    if (!id) return;

    const usuario = await this.requiereSesion();
    if (!usuario) return;

    try {
      await this.rutaService.confirmarNota(id, usuario.uid);
      this.mensaje.set('Confirmación registrada para la nota.');
      this.error.set('');
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo confirmar la nota.');
    }
  }

  comentarioNotaInvalido() {
    return this.intentoCrearNota() && !this.nuevaNota().comentario.trim();
  }
}
