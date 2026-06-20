import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../services/auth';
import { UserRole } from '../../services/usuario.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  rol = signal<UserRole>(this.rolGuardado());
  sesionActiva = signal(!!localStorage.getItem('rol'));
  cargandoSesion = signal(false);

  badgeRol = computed(() => {
    if (!this.sesionActiva()) return 'Visitante';
    if (this.rol() === 'admin') return 'Administrador';
    return 'Ciudadano';
  });

  async ngOnInit() {
    await this.cargarSesion();
  }

  async cargarSesion() {
    try {
      const usuario = await this.authService.obtenerUsuarioActual();

      this.sesionActiva.set(!!usuario);

      if (!usuario) {
        this.rol.set('usuario');
        localStorage.removeItem('rol');
        return;
      }

      const rolActual = await this.authService.getCurrentUserRole();

      if (rolActual === 'admin') {
        this.rol.set('admin');
        localStorage.setItem('rol', 'admin');
        return;
      }

      this.rol.set('usuario');
      localStorage.setItem('rol', 'usuario');
    } finally {
      this.cargandoSesion.set(false);
    }
  }

  irLogin() {
    this.router.navigate(['/login']);
  }

  irRegistro() {
    this.router.navigate(['/registro']);
  }

  async cerrarSesion() {
    try {
      localStorage.removeItem('rol');
      await this.authService.cerrarSesion();

      this.sesionActiva.set(false);
      this.rol.set('usuario');
      this.cargandoSesion.set(false);

      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  private rolGuardado(): UserRole {
    return localStorage.getItem('rol') === 'admin' ? 'admin' : 'usuario';
  }
}
