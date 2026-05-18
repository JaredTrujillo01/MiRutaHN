import { Injectable, inject } from '@angular/core';
import { doc, Firestore, getDoc, setDoc } from '@angular/fire/firestore';

export type UserRole = 'usuario' | 'admin' | 'conductor';

export interface PerfilUsuario {
  uid: string;
  nombre: string;
  email: string;
  telefono?: string;
  ciudad?: string;
  role?: UserRole;
  rol?: UserRole | 'ciudadano';
  avatarUrl?: string;
  creadoEn?: Date;
  fechaRegistro?: Date;
  rutasFavoritas?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private firestore = inject(Firestore);

  async obtenerPerfil(uid: string): Promise<PerfilUsuario | null> {
    const referencia = doc(this.firestore, 'usuarios', uid);
    const documento = await getDoc(referencia);

    if (!documento.exists()) {
      return null;
    }

    return documento.data() as PerfilUsuario;
  }

  async crearPerfil(uid: string, perfil: Omit<PerfilUsuario, 'uid'>) {
    const role: UserRole = perfil.role ?? this.normalizarRol(perfil.rol);

    return setDoc(doc(this.firestore, 'usuarios', uid), {
      uid,
      ...perfil,
      role,
      rol: role,
    });
  }

  normalizarRol(valor?: string | null): UserRole {
    if (valor === 'admin') return 'admin';
    if (valor === 'conductor') return 'conductor';

    return 'usuario';
  }
}