import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-buscar',
  imports: [],
  templateUrl: './buscar.html',
  styleUrl: './buscar.scss',
})
export class Buscar {
   @Output() buscar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}
