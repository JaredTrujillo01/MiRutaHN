import { Component, signal, inject } from '@angular/core';
import { Reporte, ReporteService } from '../../../services/reporte.service';
import { Timestamp } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-reportar',
  imports: [FormsModule, Sidebar],
  templateUrl: './reportar.html',
  styleUrl: './reportar.scss',
})
export class Reportar {
  private reporteService = inject(ReporteService);
  private authService = inject(AuthService);

  reportes = signal<Reporte[]>([]);
  cargando = signal<boolean>(true);
  mostrarFormulario = signal<boolean>(false);

  usuario: any = null;

  nuevoReporte = signal({
    tipo: 'retraso' as const,
    rutaNombre: '',
    comentario: '',
    fotoUrl: '',
  });

  tiposReporte = [
    { valor: 'retraso', icono: 'schedule', label: 'Retraso', color: '#f59e0b' },
    { valor: 'bus_lleno', icono: 'groups', label: 'Bus lleno', color: '#ef4444' },
    { valor: 'no_paso', icono: 'event_busy', label: 'No pasó', color: '#6b7280' },
    { valor: 'trafico', icono: 'traffic', label: 'Tráfico', color: '#3b82f6' },
    { valor: 'accidente', icono: 'warning', label: 'Accidente', color: '#dc2626' },
    { valor: 'otros', icono: 'more_horiz', label: 'Otros', color: '#8b5cf6' },
  ];

  constructor() {
    this.cargarUsuario();
    this.cargarReportes();
  }

  async cargarUsuario() {
    const usuarioAuth = await this.authService.obtenerUsuarioActual();

    if (usuarioAuth) {
      this.usuario = await this.authService.obtenerPerfilUsuario(usuarioAuth.uid);
    }
  }

  cargarReportes() {
    this.cargando.set(true);

    this.reporteService.getReportesActivos().subscribe({
      next: (data) => {
        this.reportes.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error:', err);
        this.cargando.set(false);
      },
    });
  }

  abrirFormulario() {
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario() {
    this.mostrarFormulario.set(false);
    this.resetFormulario();
  }

  resetFormulario() {
    this.nuevoReporte.set({
      tipo: 'retraso',
      rutaNombre: '',
      comentario: '',
      fotoUrl: '',
    });
  }

  actualizarComentario(valor: string) {
    this.nuevoReporte.update((r) => ({ ...r, comentario: valor }));
  }

  actualizarRuta(valor: string) {
    this.nuevoReporte.update((r) => ({ ...r, rutaNombre: valor }));
  }

  seleccionarTipo(tipo: string) {
    this.nuevoReporte.update((r) => ({ ...r, tipo: tipo as any }));
  }

  async enviarReporte() {
    const reporte = this.nuevoReporte();

    if (!reporte.comentario.trim()) {
      alert('Por favor escribe un comentario');
      return;
    }

    const usuarioAuth = await this.authService.obtenerUsuarioActual();

    const reporteData = {
      usuarioId: usuarioAuth?.uid || 'usuario_temp_' + Date.now(),
      usuarioNombre: this.usuario?.nombre || usuarioAuth?.email || 'Ciudadano',
      tipo: reporte.tipo,
      rutaNombre: reporte.rutaNombre || 'Ruta no especificada',
      comentario: reporte.comentario,
      fotoUrl: reporte.fotoUrl || '',
      timestamp: Timestamp.now(),
      votosUtiles: 0,
      votosFalso: 0,
      estado: 'activo' as const,
    };

    this.reporteService
      .createReporte(reporteData)
      .then(() => {
        this.cerrarFormulario();
        this.cargarReportes();
      })
      .catch((err) => {
        console.error('Error:', err);
        alert('Error al enviar reporte');
      });
  }

  eliminarReporte(id: string) {
    if (confirm('¿Eliminar este reporte?')) {
      this.reporteService.deleteReporte(id).then(() => {
        this.cargarReportes();
      });
    }
  }

  getIconoPorTipo(tipo: string): string {
    return this.tiposReporte.find((t) => t.valor === tipo)?.icono || 'report_problem';
  }

  getColorPorTipo(tipo: string): string {
    return this.tiposReporte.find((t) => t.valor === tipo)?.color || '#6b7280';
  }

  getLabelPorTipo(tipo: string): string {
    return this.tiposReporte.find((t) => t.valor === tipo)?.label || tipo;
  }

  formatearFecha(timestamp: Timestamp): string {
    const fecha = timestamp.toDate();
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Hace unos segundos';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} horas`;
    return `Hace ${diffDias} días`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const reader = new FileReader();

      reader.onload = (e) => {
        this.nuevoReporte.update((r) => ({
          ...r,
          fotoUrl: e.target?.result as string,
        }));
      };

      reader.readAsDataURL(input.files[0]);
    }
  }
}