import { Component, computed, input, output } from '@angular/core';

export type AlertModalType = 'info' | 'success' | 'error' | 'warning';

@Component({
  selector: 'app-alert-modal',
  imports: [],
  templateUrl: './app-alert-modal.html',
  styleUrl: './app-alert-modal.scss',
})
export class AppAlertModal {
  visible = input(false);
  titulo = input('Aviso');
  mensaje = input('');
  tipo = input<AlertModalType>('info');

  cerrar = output<void>();

  icono = computed(() => {
    if (this.tipo() === 'success') return 'check_circle';
    if (this.tipo() === 'error') return 'error';
    if (this.tipo() === 'warning') return 'warning';
    return 'info';
  });

  cerrarModal() {
    this.cerrar.emit();
  }
}