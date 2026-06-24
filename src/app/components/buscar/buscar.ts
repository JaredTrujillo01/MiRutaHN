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

  origen = signal('');
  destino = signal('');
  horario = signal('Ahora');
  busquedaIntentada = signal(false);
  estadoBusqueda = signal('');

  enviarBusqueda() {
    this.busquedaIntentada.set(true);
    this.estadoBusqueda.set(
      this.destino().trim()
        ? 'Búsqueda de rutas enviada.'
        : 'Ingresa un destino para mejorar los resultados.'
    );
    this.buscar.emit(this.destino());
  }

  origenInvalido() {
    return this.busquedaIntentada() && !this.origen().trim();
  }

  destinoInvalido() {
    return this.busquedaIntentada() && !this.destino().trim();
  }
}
