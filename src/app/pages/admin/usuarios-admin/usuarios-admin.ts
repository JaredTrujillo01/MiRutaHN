import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import {
  PerfilUsuario,
  UsuarioService,
  UserRole,
} from '../../../services/usuario.service';

@Component({
  selector: 'app-usuarios-admin',
  imports: [FormsModule, Sidebar],
  templateUrl: './usuarios-admin.html',
  styleUrl: './usuarios-admin.scss',
})
export class UsuariosAdmin {
  private usuarioService = inject(UsuarioService);

  usuarios = signal<PerfilUsuario[]>([]);
  cargando = signal(true);
  error = signal('');
  filtro = signal('');
  rolFiltro = signal<UserRole | 'todos'>('todos');
  actualizando = signal<string | null>(null);

  usuariosFiltrados = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const rol = this.rolFiltro();

    return this.usuarios().filter((usuario) => {
      const role = this.rolUsuario(usuario);
      const coincideRol = rol === 'todos' || role === rol;
      const coincideTexto = !texto || [
        usuario.nombre,
        usuario.email,
        usuario.telefono,
        usuario.ciudad,
        role,
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto);

      return coincideRol && coincideTexto;
    });
  });

  constructor() {
    this.usuarioService
      .getUsuarios()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (usuarios) => {
          this.usuarios.set(usuarios);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los usuarios.');
          this.cargando.set(false);
        },
      });
  }

  actualizarFiltro(valor: string) {
    this.filtro.set(valor);
  }

  actualizarRolFiltro(valor: string) {
    this.rolFiltro.set(valor as UserRole | 'todos');
  }

  rolUsuario(usuario: PerfilUsuario): UserRole {
    return this.usuarioService.normalizarRol(usuario.role ?? usuario.rol);
  }

  async cambiarRol(usuario: PerfilUsuario, rol: UserRole) {
    if (!usuario.uid || this.rolUsuario(usuario) === rol) return;

    this.actualizando.set(usuario.uid);

    try {
      await this.usuarioService.actualizarRol(usuario.uid, rol);
    } finally {
      this.actualizando.set(null);
    }
  }

  totalPorRol(rol: UserRole) {
    return this.usuarios().filter((usuario) => this.rolUsuario(usuario) === rol).length;
  }
}
