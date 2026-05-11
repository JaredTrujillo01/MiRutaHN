import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../services/reporte.service';
import { Reporte } from '../../../models/reporte.model';

@Component({
  selector: 'app-reportar',
  imports: [FormsModule],
  templateUrl: './reportar.html',
  styleUrl: './reportar.scss',
})
export class Reportar implements OnInit {
  private reporteService = inject(ReporteService);

  rutaId = '';
  tipo: Reporte['tipo'] = 'retraso';
  descripcion = '';

  reportes: Reporte[] = [];
  cargando = false;
  enviando = false;
  mensaje = '';
  error = '';

  private uidPrueba = 'user_prueba_001';
  private nombrePrueba = 'Usuario de Prueba';

  tiposReporte: { value: Reporte['tipo']; label: string }[] = [
    { value: 'retraso', label: '⏰ Retraso' },
    { value: 'desvio', label: '🔀 Desvío de ruta' },
    { value: 'lleno', label: '🚌 Bus lleno' },
    { value: 'accidente', label: '⚠️ Accidente' },
    { value: 'otro', label: '📝 Otro' },
  ];

  async ngOnInit() {
    await this.cargarReportes();
  }

  async cargarReportes() {
    this.cargando = true;
    try {
      this.reportes = await this.reporteService.obtenerReportes();
    } catch (e) {
      this.error = 'Error al cargar reportes.';
    } finally {
      this.cargando = false;
    }
  }

  async enviarReporte() {
    if (!this.rutaId.trim() || !this.descripcion.trim()) {
      this.error = 'Por favor completa todos los campos.';
      return;
    }

    this.enviando = true;
    this.error = '';
    this.mensaje = '';

    try {
      await this.reporteService.crearReporte({
        usuarioId: this.uidPrueba,
        usuarioNombre: this.nombrePrueba,
        rutaId: this.rutaId.trim(),
        tipo: this.tipo,
        descripcion: this.descripcion.trim(),
        estado: 'activo',
        fechaCreacion: new Date(),
        votos: 0
      });

      this.mensaje = '¡Reporte enviado exitosamente!';
      this.rutaId = '';
      this.descripcion = '';
      this.tipo = 'retraso';
      await this.cargarReportes();
    } catch (e) {
      this.error = 'Error al enviar el reporte. Intenta de nuevo.';
      console.error(e);
    } finally {
      this.enviando = false;
    }
  }

  async votar(id: string) {
    try {
      await this.reporteService.votarReporte(id);
      await this.cargarReportes();
    } catch (e) {
      this.error = 'Error al votar.';
    }
  }

  async marcarResuelto(id: string) {
    try {
      await this.reporteService.actualizarReporte(id, { estado: 'resuelto' });
      await this.cargarReportes();
    } catch (e) {
      this.error = 'Error al actualizar estado.';
    }
  }

  async eliminar(id: string) {
    if (!confirm('¿Eliminar este reporte?')) return;
    try {
      await this.reporteService.eliminarReporte(id);
      await this.cargarReportes();
    } catch (e) {
      this.error = 'Error al eliminar.';
    }
  }

  getLabelTipo(tipo: string): string {
    return this.tiposReporte.find(t => t.value === tipo)?.label ?? tipo;
  }
}
