import { Component, output } from '@angular/core';

@Component({
  selector: 'app-paradas-cercanas',
  imports: [],
  templateUrl: './paradas-cercanas.html',
  styleUrl: './paradas-cercanas.scss',
})
export class ParadasCercanas {
  // Output como señal
  buscar = output<void>();

  onBuscar() {
    this.buscar.emit();
  }
}