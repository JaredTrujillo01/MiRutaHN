import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  NavigationError,
  Router,
  RouterOutlet,
} from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('MiRutaHN');

  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly swUpdate = inject(SwUpdate);

  constructor() {
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((evento) => {
        if (
          evento instanceof NavigationError &&
          this.esErrorDeChunk(evento.error)
        ) {
          this.recargarUnaVez('chunk-desactualizado');
        }

        if (evento instanceof NavigationEnd) {
          sessionStorage.removeItem('mirutahn_recarga_pwa');
        }
      });

    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(
        filter(
          (evento): evento is VersionReadyEvent => evento.type === 'VERSION_READY'
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((evento) => {
        this.recargarUnaVez(`version-${evento.latestVersion.hash}`);
      });

    this.swUpdate.unrecoverable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recargarUnaVez('estado-irrecuperable'));
  }

  private esErrorDeChunk(error: unknown): boolean {
    const mensaje = String(
      error instanceof Error ? error.message : error ?? ''
    ).toLowerCase();

    return (
      mensaje.includes('failed to fetch dynamically imported module') ||
      mensaje.includes('importing a module script failed')
    );
  }

  private recargarUnaVez(motivo: string): void {
    const clave = 'mirutahn_recarga_pwa';

    if (sessionStorage.getItem(clave) === motivo) return;

    sessionStorage.setItem(clave, motivo);
    window.location.reload();
  }
}
