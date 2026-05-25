import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-prompt-modal',
  imports: [FormsModule],
  templateUrl: './app-prompt-modal.html',
  styleUrl: './app-prompt-modal.scss',
})
export class AppPromptModal {
  visible = input(false);
  titulo = input('Escribe un dato');
  label = input('Valor');
  placeholder = input('');
  valorInicial = input('');

  cancelar = output<void>();
  confirmar = output<string>();

  valor = signal('');

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.valor.set(this.valorInicial());
      }
    });
  }

  cerrar() {
    this.cancelar.emit();
  }

  aceptar() {
    const texto = this.valor().trim();
    if (!texto) return;

    this.confirmar.emit(texto);
  }
}