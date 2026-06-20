import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import {
  NotaComunitaria,
  RutaService,
  RutaTransporte,
} from '../../../services/ruta.service';

type EstadoRutaFiltro = RutaTransporte['estado'] | 'todas';

@Component({
  selector: 'app-rutas-admin',
  imports: [FormsModule, Sidebar],
  templateUrl: './rutas-admin.html',
  styleUrl: './rutas-admin.scss',
})
export class RutasAdmin {
  private rutaService = inject(RutaService);

  rutas = signal<RutaTransporte[]>([]);
  notas = signal<NotaComunitaria[]>([]);
  cargando = signal(true);
  error = signal('');
  mensaje = signal('');
  filtro = signal('');
  estadoFiltro = signal<EstadoRutaFiltro>('todas');
  actualizando = signal<string | null>(null);

  rutasActivas = computed(() =>
    this.rutas().filter((ruta) => ruta.estado === 'activa')
  );

  rutasInactivas = computed(() =>
    this.rutas().filter((ruta) => ruta.estado === 'inactiva')
  );

  rutasDesdePropuesta = computed(() =>
    this.rutas().filter((ruta) => ruta.publicadoDesdePropuesta)
  );

  rutasFiltradas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const estado = this.estadoFiltro();

    return this.rutas()
      .filter((ruta) => {
        const coincideEstado = estado === 'todas' || ruta.estado === estado;
        const coincideTexto =
          !texto ||
          [
            ruta.nombre,
            ruta.numero,
            ruta.descripcion,
            ruta.horario,
            ruta.frecuencia,
            ruta.creadoPorNombre,
            ruta.estado,
          ]
            .join(' ')
            .toLowerCase()
            .includes(texto);

        return coincideEstado && coincideTexto;
      })
      .sort((a, b) => this.fechaMillis(b.actualizadoEn || b.creadoEn) - this.fechaMillis(a.actualizadoEn || a.creadoEn));
  });

  constructor() {
    combineLatest([
      this.rutaService.getRutas(),
      this.rutaService.getNotasActivas(),
    ])
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ([rutas, notas]) => {
          this.rutas.set(rutas);
          this.notas.set(notas);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set('No se pudieron cargar las rutas publicas y sus reportes.');
          this.cargando.set(false);
        },
      });
  }

  actualizarFiltro(valor: string) {
    this.filtro.set(valor);
  }

  actualizarEstadoFiltro(valor: string) {
    this.estadoFiltro.set(valor as EstadoRutaFiltro);
  }

  async cambiarEstado(ruta: RutaTransporte, estado: RutaTransporte['estado']) {
    if (!ruta.id || ruta.estado === estado) return;

    this.actualizando.set(ruta.id);
    this.mensaje.set('');
    this.error.set('');

    try {
      await this.rutaService.updateRuta(ruta.id, { estado });
      this.mensaje.set(
        estado === 'activa'
          ? 'La ruta fue activada correctamente.'
          : 'La ruta fue desactivada correctamente.'
      );
    } catch {
      this.error.set('No se pudo actualizar el estado de la ruta.');
    } finally {
      this.actualizando.set(null);
    }
  }

  async eliminarRuta(ruta: RutaTransporte) {
    if (!ruta.id) return;

    const confirmar = window.confirm(
      `Eliminar la ruta "${ruta.nombre}" del sistema?`
    );

    if (!confirmar) return;

    this.actualizando.set(ruta.id);
    this.mensaje.set('');
    this.error.set('');

    try {
      await this.rutaService.deleteRuta(ruta.id);
      this.mensaje.set('La ruta fue eliminada correctamente.');
    } catch {
      this.error.set('No se pudo eliminar la ruta.');
    } finally {
      this.actualizando.set(null);
    }
  }

  estadoRutaTexto(ruta: RutaTransporte) {
    return ruta.estado === 'activa' ? 'Activa' : 'Inactiva';
  }

  totalParadas(ruta: RutaTransporte) {
    return ruta.paradas?.length || 0;
  }

  totalRecorrido(ruta: RutaTransporte) {
    return ruta.recorrido?.length || ruta.puntosGuia?.length || 0;
  }

  totalReportes(ruta: RutaTransporte) {
    if (!ruta.id) return 0;

    return this.notas().filter(
      (nota) => nota.rutaId === ruta.id && nota.campoMarcado === 'ruta_falsa'
    ).length;
  }

  formatearFecha(fecha?: any) {
    if (!fecha) return 'Sin fecha';

    const valor = fecha?.toDate ? fecha.toDate() : new Date(fecha);

    if (Number.isNaN(valor.getTime())) return 'Sin fecha';

    return valor.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private fechaMillis(fecha?: any) {
    if (!fecha) return 0;

    if (fecha?.toMillis) return fecha.toMillis();
    if (fecha?.toDate) return fecha.toDate().getTime();

    const valor = new Date(fecha).getTime();
    return Number.isNaN(valor) ? 0 : valor;
  }
}
