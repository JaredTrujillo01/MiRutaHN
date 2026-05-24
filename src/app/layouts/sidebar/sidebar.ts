import { Component, inject, OnInit } from '@angular/core';
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

  rol: UserRole = 'usuario';
  sesionActiva = false;

  async ngOnInit() {
    await this.cargarSesion();
  }

  async cargarSesion() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.sesionActiva = !!usuario;

    if (!usuario) {
      this.rol = 'usuario';
      localStorage.removeItem('rol');
      return;
    }

    const rolActual = await this.authService.getCurrentUserRole();
    this.rol = rolActual ?? 'usuario';
    localStorage.setItem('rol', this.rol);
  }

  get badgeRol() {
    if (!this.sesionActiva) return 'Visitante';
    if (this.rol === 'admin') return 'Administrador';
    return 'Ciudadano';
  }

  irLogin() {
    this.router.navigate(['/login']);
  }

  irRegistro() {
    this.router.navigate(['/registro']);
  }

  async cerrarSesion() {
    try {
      await this.authService.cerrarSesion();
      this.sesionActiva = false;
      this.rol = 'usuario';
      this.router.navigate(['/inicio']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}