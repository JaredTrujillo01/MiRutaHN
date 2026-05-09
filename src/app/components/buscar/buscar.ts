import { Component, output } from '@angular/core';

@Component({
  selector: 'app-buscar',
  imports: [],
  templateUrl: './buscar.html',
  styleUrl: './buscar.scss',
})
export class Buscar {
  buscar = output<void>();
  cancelar = output<void>();
}
