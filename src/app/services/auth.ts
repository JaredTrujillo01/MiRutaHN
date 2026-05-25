import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  User,
} from '@angular/fire/auth';
import { UsuarioService, PerfilUsuario, UserRole } from './usuario.service';

export interface RegistroUsuario {
  nombre: string;
  email: string;
  telefono: string;
  ciudad: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private injector = inject(Injector);
  private auth = inject(Auth);
  private usuarioService = inject(UsuarioService);

  loginUsuario(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  cerrarSesion() {
    localStorage.removeItem('rol');
    return signOut(this.auth);
  }

  obtenerUsuarioActual(): Promise<User | null> {
    return new Promise((resolve) => {
      const usuarioActual = runInInjectionContext(
        this.injector,
        () => this.auth.currentUser
      );

      if (usuarioActual) {
        resolve(usuarioActual);
        return;
      }

      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(
          runInInjectionContext(this.injector, () => this.auth.currentUser)
        );
      }, 3000);

      const unsubscribe = runInInjectionContext(this.injector, () =>
        onAuthStateChanged(
          this.auth,
          (user) => {
            clearTimeout(timeout);
            unsubscribe();
            resolve(user);
          },
          () => {
            clearTimeout(timeout);
            unsubscribe();
            resolve(null);
          }
        )
      );
    });
  }

  getCurrentUser(): Promise<User | null> {
    return this.obtenerUsuarioActual();
  }

  async isLoggedIn(): Promise<boolean> {
    return !!(await this.obtenerUsuarioActual());
  }

  async obtenerPerfilUsuario(uid: string): Promise<PerfilUsuario | null> {
    return this.usuarioService.obtenerPerfil(uid);
  }

  async getCurrentUserProfile(): Promise<PerfilUsuario | null> {
    const usuario = await this.obtenerUsuarioActual();

    if (!usuario) {
      return null;
    }

    return this.obtenerPerfilUsuario(usuario.uid);
  }

  async getCurrentUserRole(): Promise<UserRole | null> {
    const perfil = await this.getCurrentUserProfile();

    if (!perfil) {
      return null;
    }

    return this.usuarioService.normalizarRol(perfil.role ?? perfil.rol);
  }

  async hasRole(roles: UserRole | UserRole[]): Promise<boolean> {
    const rolActual = await this.getCurrentUserRole();
    const rolesPermitidos = Array.isArray(roles) ? roles : [roles];

    return !!rolActual && rolesPermitidos.includes(rolActual);
  }

  async isAdmin(): Promise<boolean> {
    return this.hasRole('admin');
  }

  async registrarUsuario(usuario: RegistroUsuario) {
    const credenciales = await createUserWithEmailAndPassword(
      this.auth,
      usuario.email,
      usuario.password
    );

    await this.usuarioService.crearPerfil(credenciales.user.uid, {
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      ciudad: usuario.ciudad,
      role: 'usuario',
      rol: 'usuario',
      avatarUrl: 'assets/avatars/avatar-1.png',
      creadoEn: new Date(),
    });

    return credenciales;
  }

  async cambiarPassword(passwordActual: string, passwordNueva: string) {
    const usuario = this.auth.currentUser;

    if (!usuario || !usuario.email) {
      throw new Error('No hay una sesión activa.');
    }

    const credenciales = EmailAuthProvider.credential(
      usuario.email,
      passwordActual
    );

    await reauthenticateWithCredential(usuario, credenciales);
    await updatePassword(usuario, passwordNueva);
  }
}
