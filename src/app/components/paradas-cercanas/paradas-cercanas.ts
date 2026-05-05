import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-paradas-cercanas',
  imports: [],
  templateUrl: './paradas-cercanas.html',
  styleUrl: './paradas-cercanas.scss',
})
export class ParadasCercanas {
  @Output() buscar = new EventEmitter<void>();

  onBuscar() {
    this.buscar.emit();
  }
}
