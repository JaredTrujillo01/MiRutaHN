import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-detalle-ruta',
  imports: [],
  templateUrl: './detalle-ruta.html',
  styleUrl: './detalle-ruta.scss',
})
export class DetalleRuta {
  @Input() ruta: any;
  @Output() volver = new EventEmitter<void>();
}
