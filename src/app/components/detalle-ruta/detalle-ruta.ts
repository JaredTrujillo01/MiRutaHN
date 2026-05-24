import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';

import { AuthService } from '../../services/auth';
import { NotaComunitaria, RutaService } from '../../services/ruta.service';

@Component({
  selector: 'app-detalle-ruta',
  imports: [FormsModule],
  templateUrl: './detalle-ruta.html',
  styleUrl: './detalle-ruta.scss',
})
export class DetalleRuta {
  private rutaService = inject(RutaService);
  private authService = inject(AuthService);

  ruta = input<any>();
  volver = output<void>();
  iniciarNavegacion = output<void>();

  notas = signal<NotaComunitaria[]>([]);
  nuevaNota = signal({
    campoMarcado: 'otro' as NonNullable<NotaComunitaria['campoMarcado']>,
    comentario: '',
  });

  constructor() {
    effect(() => {
      const ruta = this.ruta();

      if (!ruta?.id) {
        this.notas.set([]);
        return;
      }

      this.rutaService
        .getNotasPorRuta(String(ruta.id))
        .subscribe((notas) => this.notas.set(notas));
    });
  }

  tituloRuta() {
    const ruta = this.ruta();

    if (!ruta) {
      return 'Ruta seleccionada';
    }

    return ruta.numero ? `${ruta.nombre} - Ruta ${ruta.numero}` : ruta.nombre;
  }

  precioRuta() {
    const precio = this.ruta()?.precio;
    return precio ? `L. ${precio}` : 'No definido';
  }

  frecuenciaRuta() {
    return this.ruta()?.frecuencia || 'No definida';
  }

  paradasRuta() {
    return this.ruta()?.paradas || [];
  }

  actualizarNotaCampo(campo: 'campoMarcado' | 'comentario', valor: string) {
    this.nuevaNota.update((nota) => ({
      ...nota,
      [campo]: valor,
    }));
  }

  async crearNota() {
    const ruta = this.ruta();
    const nota = this.nuevaNota();
    const usuarioAuth = await this.authService.obtenerUsuarioActual();

    if (!ruta?.id || !usuarioAuth) {
      alert('Debes iniciar sesion para agregar notas.');
      return;
    }

    if (!nota.comentario.trim()) {
      alert('Escribe una observacion.');
      return;
    }

    const perfil = await this.authService.obtenerPerfilUsuario(usuarioAuth.uid);

    await this.rutaService.createNotaComunitaria({
      rutaId: String(ruta.id),
      usuarioId: usuarioAuth.uid,
      usuarioNombre: perfil?.nombre || usuarioAuth.email || 'Ciudadano',
      comentario: nota.comentario,
      campoMarcado: nota.campoMarcado,
      estado: 'activa',
      votosUtiles: 0,
      confirmaciones: 0,
      creadoEn: Timestamp.now(),
    });

    this.nuevaNota.set({
      campoMarcado: 'otro',
      comentario: '',
    });
  }

  votarNota(id?: string) {
    if (!id) return;
    this.rutaService.votarNotaUtil(id);
  }

  confirmarNota(id?: string) {
    if (!id) return;
    this.rutaService.confirmarNota(id);
  }
}
