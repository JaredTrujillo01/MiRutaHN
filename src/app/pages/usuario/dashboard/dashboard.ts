import { Component, signal } from '@angular/core';
import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { ParadasCercanas } from '../../../components/paradas-cercanas/paradas-cercanas';
import { Buscar } from '../../../components/buscar/buscar';
import { ResultadosBusqueda } from '../../../components/resultados-busqueda/resultados-busqueda';
import { DetalleRuta } from '../../../components/detalle-ruta/detalle-ruta';

@Component({
  selector: 'app-dashboard',
  imports: [Sidebar, ParadasCercanas, Buscar, ResultadosBusqueda, DetalleRuta],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  paso = signal<number>(1);
  rutaSeleccionada = signal<any>(null);
  navegacionActiva = signal<boolean>(false);

  irAPaso(paso: number, ruta?: any) {
    this.paso.set(paso);
    if (ruta) {
      this.rutaSeleccionada.set(ruta);
    }
    // Resetear navegación al salir del paso 4
    if (paso !== 4) {
      this.navegacionActiva.set(false);
    }
  }

  onIniciarNavegacion() {
    this.navegacionActiva.set(true);
  }

  salirNavegacion() {
    this.navegacionActiva.set(false);
    this.paso.set(1); // Volver al inicio
    this.rutaSeleccionada.set(null); // Limpiar ruta seleccionada
  }
}