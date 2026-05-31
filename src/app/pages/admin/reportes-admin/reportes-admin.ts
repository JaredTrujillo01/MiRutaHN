import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { Reporte, ReporteService } from '../../../services/reporte.service';

@Component({
  selector: 'app-reportes-admin',
  imports: [FormsModule, Sidebar],
  templateUrl: './reportes-admin.html',
  styleUrl: './reportes-admin.scss',
})
export class ReportesAdmin {
  private reporteService = inject(ReporteService);

  reportes = signal<Reporte[]>([]);
  cargando = signal(true);
  error = signal('');
  filtroEstado = signal<Reporte['estado'] | 'todos'>('todos');
  filtroTexto = signal('');
  actualizando = signal<string | null>(null);

  estados: Array<{ valor: Reporte['estado'] | 'todos'; label: string; icono: string }> = [
    { valor: 'todos', label: 'Todos', icono: 'select_all' },
    { valor: 'activo', label: 'Activos', icono: 'campaign' },
    { valor: 'confirmado', label: 'Confirmados', icono: 'verified' },
    { valor: 'resuelto', label: 'Resueltos', icono: 'task_alt' },
    { valor: 'falso', label: 'Falsos', icono: 'block' },
  ];

  reportesFiltrados = computed(() => {
    const estado = this.filtroEstado();
    const texto = this.filtroTexto().trim().toLowerCase();

    return this.reportes().filter((reporte) => {
      const coincideEstado = estado === 'todos' || reporte.estado === estado;
      const coincideTexto = !texto || [
        reporte.tipo,
        reporte.rutaNombre,
        reporte.comentario,
        reporte.usuarioNombre,
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto);

      return coincideEstado && coincideTexto;
    });
  });

  constructor() {
    this.reporteService
      .getReportes()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (reportes) => {
          this.reportes.set(reportes);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los reportes.');
          this.cargando.set(false);
        },
      });
  }

  actualizarFiltroEstado(valor: string) {
    this.filtroEstado.set(valor as Reporte['estado'] | 'todos');
  }

  actualizarFiltroTexto(valor: string) {
    this.filtroTexto.set(valor);
  }

  async cambiarEstado(reporte: Reporte, estado: Reporte['estado']) {
    if (!reporte.id || reporte.estado === estado) return;

    this.actualizando.set(reporte.id);

    try {
      await this.reporteService.updateEstadoReporte(reporte.id, estado);
    } finally {
      this.actualizando.set(null);
    }
  }

  async eliminarReporte(reporte: Reporte) {
    if (!reporte.id) return;

    this.actualizando.set(reporte.id);

    try {
      await this.reporteService.deleteReporte(reporte.id);
    } finally {
      this.actualizando.set(null);
    }
  }

  estadoLabel(estado: Reporte['estado']) {
    return this.estados.find((item) => item.valor === estado)?.label || estado;
  }

  tipoLabel(tipo: Reporte['tipo']) {
    const labels: Record<Reporte['tipo'], string> = {
      retraso: 'Retraso',
      bus_lleno: 'Bus lleno',
      no_paso: 'No paso',
      trafico: 'Trafico',
      accidente: 'Accidente',
      otros: 'Otros',
    };

    return labels[tipo];
  }

  formatearFecha(reporte: Reporte) {
    return reporte.timestamp.toDate().toLocaleString('es-HN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}
