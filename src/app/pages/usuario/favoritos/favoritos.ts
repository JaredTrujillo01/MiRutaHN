import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';
import { RutaService, RutaTransporte } from '../../../services/ruta.service';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-favoritos',
  imports: [RouterLink, Sidebar],
  templateUrl: './favoritos.html',
  styleUrl: './favoritos.scss',
})
export class Favoritos {
  private router = inject(Router);
  private authService = inject(AuthService);
  private rutaService = inject(RutaService);
  private usuarioService = inject(UsuarioService);

  rutas = signal<RutaTransporte[]>([]);
  favoritosIds = signal<string[]>([]);
  usuarioId = signal<string | null>(null);
  cargando = signal(true);
  eliminando = signal<string | null>(null);
  error = signal('');

  favoritos = computed(() =>
    this.rutas().filter((ruta) => ruta.id && this.favoritosIds().includes(ruta.id))
  );

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
          this.error.set('No se pudieron cargar tus rutas favoritas.');
          this.cargando.set(false);
        },
      });
  }

  async cargarUsuario() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.usuarioId.set(usuario?.uid ?? null);

    if (!usuario) {
      this.favoritosIds.set([]);
      return;
    }

    const perfil = await this.authService.obtenerPerfilUsuario(usuario.uid);
    this.favoritosIds.set(perfil?.rutasFavoritas ?? []);
  }

  verRuta(ruta: RutaTransporte) {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        paso: 4,
        rutaId: ruta.id,
      },
    });
  }

  async eliminarFavorito(id?: string) {
    if (!id || !this.usuarioId()) return;

    this.eliminando.set(id);

    try {
      await this.usuarioService.eliminarRutaFavorita(this.usuarioId()!, id);
      this.favoritosIds.update((items) => items.filter((item) => item !== id));
    } finally {
      this.eliminando.set(null);
    }
  }

  tiempoEstimado(ruta: RutaTransporte) {
    const paradas = ruta.paradas?.length || 1;
    return `${Math.max(12, paradas * 6)} min`;
  }

  paradasResumen(ruta: RutaTransporte) {
    return ruta.paradas?.length ? `${ruta.paradas.length} paradas` : 'Sin paradas';
  }
}
