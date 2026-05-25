import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-required-modal',
  imports: [RouterLink],
  templateUrl: './auth-required-modal.html',
  styleUrl: './auth-required-modal.scss',
})
export class AuthRequiredModal {
  visible = input(false);

  titulo = input('Inicia sesión para continuar');

  mensaje = input(
    'Para colaborar en MiRutaHN debes iniciar sesión o crear una cuenta.'
  );

  cerrar = output<void>();

  cerrarModal() {
    this.cerrar.emit();
  }
}