import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-resultados-busqueda',
  imports: [],
  templateUrl: './resultados-busqueda.html',
  styleUrl: './resultados-busqueda.scss',
})
export class ResultadosBusqueda {
  verDetalle = output<any>();
  volver = output<void>();

  rutas = signal([
    { id: 1, nombre: 'Ruta 2 - Anillo Periférico', precio: 13, tiempo: 45, llega: '10 min', active: true },
    { id: 2, nombre: 'Ruta 35 - Centro Directo', precio: 16, tiempo: 30, llega: '18 min', active: false },
    { id: 3, nombre: 'Trans-H - Rápido Metropolitano', precio: 20, tiempo: 22, llega: '2 min', active: false }
  ]);

  seleccionarRuta(ruta: any) {
    this.verDetalle.emit(ruta);
  }
}
