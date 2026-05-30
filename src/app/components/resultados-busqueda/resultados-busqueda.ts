import { Component, input, output } from '@angular/core';
import { RutaTransporte } from '../../services/ruta.service';

@Component({
  selector: 'app-resultados-busqueda',
  imports: [],
  templateUrl: './resultados-busqueda.html',
  styleUrl: './resultados-busqueda.scss',
})
export class ResultadosBusqueda {
  rutas = input<RutaTransporte[]>([]);
  cargando = input(false);
  termino = input('');

  verDetalle = output<RutaTransporte>();
  volver = output<void>();

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