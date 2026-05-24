import { Component, inject, output, signal } from '@angular/core';
import { RutaService, RutaTransporte } from '../../services/ruta.service';

@Component({
  selector: 'app-resultados-busqueda',
  imports: [],
  templateUrl: './resultados-busqueda.html',
  styleUrl: './resultados-busqueda.scss',
})
export class ResultadosBusqueda {
  private rutaService = inject(RutaService);

  verDetalle = output<any>();
  volver = output<void>();

  rutas = signal<RutaTransporte[]>([]);
  cargando = signal(true);

  constructor() {
    this.rutaService.getRutas().subscribe({
      next: (rutas) => {
        this.rutas.set(rutas.filter((ruta) => ruta.estado === 'activa'));
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.cargando.set(false);
      },
    });
  }

  seleccionarRuta(ruta: RutaTransporte) {
    this.verDetalle.emit(ruta);
  }

  tiempoEstimado(ruta: RutaTransporte) {
    const paradas = ruta.paradas?.length || 1;
    return Math.max(12, paradas * 6);
  }

  llegadaEstimada(index: number) {
    return `${8 + index * 5} min`;
  }
}
