import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-detalle-ruta',
  imports: [],
  templateUrl: './detalle-ruta.html',
  styleUrl: './detalle-ruta.scss',
})
export class DetalleRuta {
  ruta = input<any>();
  volver = output<void>();
  iniciarNavegacion = output<void>();
}
