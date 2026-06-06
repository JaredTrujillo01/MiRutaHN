import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';
import {
  NotaComunitaria,
  PropuestaRuta,
  RutaService,
  RutaTransporte,
} from '../../../services/ruta.service';
import {
  PerfilUsuario,
  UsuarioService,
} from '../../../services/usuario.service';

@Component({
  selector: 'app-dashboard-admin',
  imports: [RouterLink, Sidebar],
  templateUrl: './dashboard-admin.html',
  styleUrl: './dashboard-admin.scss',
})
export class DashboardAdmin {
  private rutaService = inject(RutaService);
  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);

  rutas = signal<RutaTransporte[]>([]);
  propuestas = signal<PropuestaRuta[]>([]);
  notas = signal<NotaComunitaria[]>([]);
  usuarios = signal<PerfilUsuario[]>([]);
  adminActual = signal<PerfilUsuario | null>(null);

  cargando = signal(true);
  error = signal('');

  rutasPublicas = computed(() =>
    this.rutas().filter((ruta) => ruta.estado === 'activa')
  );

  propuestasPendientes = computed(() =>
    this.propuestas().filter((propuesta) => propuesta.estado === 'pendiente')
  );

  propuestasAprobadas = computed(() =>
    this.propuestas().filter((propuesta) => propuesta.estado === 'aprobada')
  );

  propuestasRechazadas = computed(() =>
    this.propuestas().filter((propuesta) => propuesta.estado === 'rechazada')
  );

  propuestasPorRevisar = computed(() =>
    this.propuestasPendientes()
      .filter(
        (propuesta) =>
          (propuesta.aprobaciones || 0) > 0 ||
          (propuesta.rechazos || 0) > 0
      )
      .slice(0, 4)
  );

  notasActivas = computed(() =>
    this.notas().filter((nota) => nota.estado === 'activa')
  );

  usuariosAdmin = computed(() =>
    this.usuarios().filter((usuario) => this.rolUsuario(usuario) === 'admin')
  );

  usuariosRegulares = computed(() =>
    this.usuarios().filter((usuario) => this.rolUsuario(usuario) === 'usuario')
  );

  rutasRecientes = computed(() =>
    [...this.rutasPublicas()]
      .sort((a, b) => this.fechaMillis(b.creadoEn || b.actualizadoEn) - this.fechaMillis(a.creadoEn || a.actualizadoEn))
      .slice(0, 5)
  );

  usuariosRecientes = computed(() =>
    [...this.usuarios()]
      .sort((a, b) => this.fechaMillis(b.creadoEn || b.fechaRegistro) - this.fechaMillis(a.creadoEn || a.fechaRegistro))
      .slice(0, 4)
  );

  actividadReciente = computed(() => {
    const propuestas = this.propuestas().slice(0, 4).map((propuesta) => ({
      icono: this.iconoPropuesta(propuesta),
      titulo: this.tipoPropuestaTexto(propuesta),
      descripcion: propuesta.nombre,
      detalle: `Estado: ${this.estadoTexto(propuesta.estado)}`,
      fecha: propuesta.creadoEn,
    }));

    const rutas = this.rutasRecientes().slice(0, 3).map((ruta) => ({
      icono: 'route',
      titulo: 'Ruta publica aprobada',
      descripcion: ruta.nombre,
      detalle: ruta.creadoPorNombre || 'Origen comunitario',
      fecha: ruta.actualizadoEn || ruta.creadoEn,
    }));

    const notas = this.notasActivas().slice(0, 3).map((nota) => ({
      icono: 'rate_review',
      titulo: 'Nota comunitaria',
      descripcion: nota.comentario,
      detalle: nota.usuarioNombre,
      fecha: nota.creadoEn,
    }));

    const usuarios = this.usuariosRecientes().slice(0, 3).map((usuario) => ({
      icono: 'person_add',
      titulo: 'Usuario registrado',
      descripcion: usuario.nombre || usuario.email,
      detalle: this.rolUsuario(usuario) === 'admin' ? 'Administrador' : 'Usuario',
      fecha: usuario.creadoEn || usuario.fechaRegistro,
    }));

    return [...propuestas, ...rutas, ...notas, ...usuarios]
      .sort((a, b) => this.fechaMillis(b.fecha) - this.fechaMillis(a.fecha))
      .slice(0, 8);
  });

  constructor() {
    this.cargarAdminActual();
    this.cargarDatos();
  }

  private async cargarAdminActual() {
    const perfil = await this.authService.getCurrentUserProfile();
    this.adminActual.set(perfil);
  }

  private cargarDatos() {
    this.cargando.set(true);
    this.error.set('');

    combineLatest([
      this.rutaService.getRutas(),
      this.rutaService.getPropuestasRuta(),
      this.rutaService.getNotasActivas(),
      this.usuarioService.getUsuarios(),
    ])
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ([rutas, propuestas, notas, usuarios]) => {
          this.rutas.set(rutas);
          this.propuestas.set(propuestas);
          this.notas.set(notas);
          this.usuarios.set(usuarios);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set(
            'No se pudo cargar la informacion del sistema. Intenta nuevamente mas tarde.'
          );
          this.cargando.set(false);
        },
      });
  }

  rolUsuario(usuario: PerfilUsuario) {
    return this.usuarioService.normalizarRol(usuario.role ?? usuario.rol);
  }

  estadoTexto(estado?: string) {
    if (estado === 'aprobada') return 'Aprobada';
    if (estado === 'rechazada') return 'Rechazada';
    if (estado === 'inactiva') return 'Inactiva';
    if (estado === 'activa') return 'Activa';
    return 'Pendiente';
  }

  tipoPropuestaTexto(propuesta: PropuestaRuta) {
    if (propuesta.tipoPropuesta === 'actualizacion') return 'Actualizacion de ruta';
    if (propuesta.tipoPropuesta === 'eliminacion') return 'Reporte de eliminacion';
    return 'Nueva ruta propuesta';
  }

  iconoPropuesta(propuesta: PropuestaRuta) {
    if (propuesta.tipoPropuesta === 'actualizacion') return 'edit_road';
    if (propuesta.tipoPropuesta === 'eliminacion') return 'report';
    return 'add_road';
  }

  progresoPropuesta(propuesta: PropuestaRuta) {
    const aprobaciones = propuesta.aprobaciones || 0;
    const rechazos = propuesta.rechazos || 0;

    if (rechazos > aprobaciones) {
      return `${rechazos} rechazos`;
    }

    return `${aprobaciones} aprobaciones`;
  }

  formatearPrecio(precio?: number) {
    return `L. ${Number(precio || 0).toFixed(2)}`;
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

  private fechaMillis(fecha: any) {
    if (!fecha) return 0;
    if (typeof fecha.toMillis === 'function') return fecha.toMillis();
    if (typeof fecha.toDate === 'function') return fecha.toDate().getTime();
    if (fecha instanceof Date) return fecha.getTime();
    return new Date(fecha).getTime() || 0;
  }
}
