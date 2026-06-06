import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';
import {
  NotaComunitaria,
  RutaService,
  RutaTransporte,
} from '../../../services/ruta.service';

@Component({
  selector: 'app-notas-comunitarias',
  imports: [FormsModule, Sidebar],
  templateUrl: './notas-comunitarias.html',
  styleUrl: './notas-comunitarias.scss',
})
export class NotasComunitarias {
  private rutaService = inject(RutaService);
  private authService = inject(AuthService);

  rutas = signal<RutaTransporte[]>([]);
  notas = signal<NotaComunitaria[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  esAdmin = signal(false);
  filtro = signal('');

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
    this.usuarioAuth = await this.authService.obtenerUsuarioActual();

    if (this.usuarioAuth) {
      this.usuarioPerfil = await this.authService.obtenerPerfilUsuario(
        this.usuarioAuth.uid
      );
    }

    this.esAdmin.set(await this.authService.isAdmin());
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

    if (!(await this.puedeParticipar())) return;

    if (!this.usuarioAuth) {
      alert('Debes iniciar sesión para agregar notas.');
      return;
    }

    if (!nota.rutaId || !nota.comentario.trim()) {
      alert('Selecciona una ruta y escribe la observación.');
      return;
    }

    this.guardando.set(true);

    try {
      await this.rutaService.createNotaComunitaria({
        rutaId: nota.rutaId,
        usuarioId: this.usuarioAuth.uid,
        usuarioNombre:
          this.usuarioPerfil?.nombre || this.usuarioAuth.email || 'Ciudadano',
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
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar la nota.');
    } finally {
      this.guardando.set(false);
    }
  }

  async votarNota(id?: string) {
    if (!id) return;
    if (!(await this.puedeParticipar())) return;

    this.rutaService.votarNotaUtil(id);
  }

  async confirmarNota(id?: string) {
    if (!id) return;
    if (!(await this.puedeParticipar())) return;

    this.rutaService.confirmarNota(id);
  }

  resolverNota(id?: string) {
    if (!this.esAdmin() || !id) return;
    this.rutaService.resolverNotaComunitaria(id);
  }

  notasFiltradas() {
    const filtro = this.filtro().trim().toLowerCase();

    if (!filtro) {
      return this.notas();
    }

    return this.notas().filter((nota) => {
      const texto = [
        nota.comentario,
        nota.campoMarcado,
        nota.usuarioNombre,
        this.nombreRuta(nota.rutaId),
      ]
        .join(' ')
        .toLowerCase();

      return texto.includes(filtro);
    });
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

  private async puedeParticipar() {
    if (!this.usuarioAuth) {
      alert('Debes iniciar sesiÃ³n para participar en notas comunitarias.');
      return false;
    }

    const perfil =
      this.usuarioPerfil ||
      (await this.authService.obtenerPerfilUsuario(this.usuarioAuth.uid));

    if (this.authService.estaUsuarioSuspendido(perfil)) {
      alert(this.authService.mensajeSuspension(perfil));
      return false;
    }

    return true;
  }
}
