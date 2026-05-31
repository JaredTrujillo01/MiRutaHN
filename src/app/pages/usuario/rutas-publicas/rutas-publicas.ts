import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { RutaService, RutaTransporte } from '../../../services/ruta.service';
import { AuthService } from '../../../services/auth';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-rutas-publicas',
  imports: [FormsModule, Sidebar],
  templateUrl: './rutas-publicas.html',
  styleUrl: './rutas-publicas.scss',
})
export class RutasPublicas {
  private rutaService = inject(RutaService);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);

  rutas = signal<RutaTransporte[]>([]);
  cargando = signal(true);
  error = signal('');
  filtro = signal('');
  favoritos = signal<string[]>([]);
  usuarioId = signal<string | null>(null);
  guardandoFavorito = signal<string | null>(null);

  rutasFiltradas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const activas = this.rutas().filter((ruta) => ruta.estado === 'activa');

    if (!texto) {
      return activas;
    }

    return activas.filter((ruta) =>
      [
        ruta.nombre,
        ruta.numero,
        ruta.descripcion,
        ruta.horario,
        ruta.frecuencia,
        ruta.precio,
        ...(ruta.paradas || []).map((parada) => parada.nombre),
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto)
    );
  });

  constructor() {
    this.cargarUsuario();

    this.rutaService
      .getRutas()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (rutas) => {
          this.rutas.set(rutas);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las rutas publicas.');
          this.cargando.set(false);
        },
      });
  }

  async cargarUsuario() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.usuarioId.set(usuario?.uid ?? null);

    if (!usuario) {
      this.favoritos.set([]);
      return;
    }

    const perfil = await this.authService.obtenerPerfilUsuario(usuario.uid);
    this.favoritos.set(perfil?.rutasFavoritas ?? []);
  }

  actualizarFiltro(valor: string) {
    this.filtro.set(valor);
  }

  esFavorita(rutaId?: string) {
    return !!rutaId && this.favoritos().includes(rutaId);
  }

  async alternarFavorito(ruta: RutaTransporte) {
    if (!ruta.id || !this.usuarioId()) return;

    this.guardandoFavorito.set(ruta.id);

    try {
      if (this.esFavorita(ruta.id)) {
        await this.usuarioService.eliminarRutaFavorita(this.usuarioId()!, ruta.id);
        this.favoritos.update((items) => items.filter((id) => id !== ruta.id));
      } else {
        await this.usuarioService.agregarRutaFavorita(this.usuarioId()!, ruta.id);
        this.favoritos.update((items) => [...items, ruta.id!]);
      }
    } finally {
      this.guardandoFavorito.set(null);
    }
  }

  paradasResumen(ruta: RutaTransporte) {
    return ruta.paradas?.length ? `${ruta.paradas.length} paradas` : 'Sin paradas registradas';
  }
}
