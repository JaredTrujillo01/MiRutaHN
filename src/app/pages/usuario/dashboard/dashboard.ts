import { Component } from '@angular/core';
import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { ParadasCercanas } from '../../../components/paradas-cercanas/paradas-cercanas';
import { DetalleRuta } from '../../../components/detalle-ruta/detalle-ruta';
import { ResultadosBusqueda } from '../../../components/resultados-busqueda/resultados-busqueda';
import { Buscar } from '../../../components/buscar/buscar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule,Sidebar, ParadasCercanas, DetalleRuta, ResultadosBusqueda, Buscar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  paso: number = 1;
  rutaSeleccionada: any = null;

  irAPaso(paso: number, ruta?: any) {
    this.paso = paso;
    if (ruta) {
      this.rutaSeleccionada = ruta;
    }
  }
}
