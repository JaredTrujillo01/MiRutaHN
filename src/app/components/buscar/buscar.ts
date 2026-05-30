import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-buscar',
  imports: [FormsModule],
  templateUrl: './buscar.html',
  styleUrl: './buscar.scss',
})
export class Buscar {
  buscar = output<string>();
  cancelar = output<void>();

  origen = signal('Colonia Miraflores');
  destino = signal('');
  horario = signal('Ahora');

  enviarBusqueda() {
    this.buscar.emit(this.destino());
  }
}