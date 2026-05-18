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

  ngOnInit() {
    const rolGuardado = localStorage.getItem('rol') as UserRole | null;

    if (
      rolGuardado === 'admin' ||
      rolGuardado === 'conductor' ||
      rolGuardado === 'usuario'
    ) {
      this.rol = rolGuardado;
    }

    this.actualizarRolDesdeFirebase();
  }

  async actualizarRolDesdeFirebase() {
    try {
      const rolActual = await this.authService.getCurrentUserRole();

      if (rolActual) {
        this.rol = rolActual;
        localStorage.setItem('rol', rolActual);
      }
    } catch (error) {
      console.error('Error cargando rol:', error);
    }
  }

  get badgeRol() {
    if (this.rol === 'admin') return 'Administrador';
    if (this.rol === 'conductor') return 'Conductor';
    return 'Ciudadano';
  }

  async cerrarSesion() {
    try {
      localStorage.removeItem('rol');
      await this.authService.cerrarSesion();
      this.router.navigate(['/inicio']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
}