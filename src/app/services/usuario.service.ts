import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import {
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  doc,
  Firestore,
  getDoc,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export type UserRole = 'usuario' | 'admin';

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
  private injector = inject(Injector);
  private firestore = inject(Firestore);

  async obtenerPerfil(uid: string): Promise<PerfilUsuario | null> {
    const documento = await runInInjectionContext(this.injector, () =>
      getDoc(doc(this.firestore, 'usuarios', uid))
    );

    if (!documento.exists()) {
      return null;
    }

    return documento.data() as PerfilUsuario;
  }

  getUsuarios(): Observable<PerfilUsuario[]> {
    const usuariosCollection = collection(this.firestore, 'usuarios');
    const q = query(usuariosCollection, orderBy('nombre', 'asc'));

    return collectionData(q, { idField: 'uid' }) as Observable<PerfilUsuario[]>;
  }

  async crearPerfil(uid: string, perfil: Omit<PerfilUsuario, 'uid'>) {
    const role: UserRole = perfil.role ?? this.normalizarRol(perfil.rol);

    return runInInjectionContext(this.injector, () =>
      setDoc(doc(this.firestore, 'usuarios', uid), {
        uid,
        ...perfil,
        role,
        rol: role,
      })
    );
  }

  actualizarRol(uid: string, role: UserRole) {
    return updateDoc(doc(this.firestore, 'usuarios', uid), {
      role,
      rol: role,
    });
  }

  agregarRutaFavorita(uid: string, rutaId: string) {
    return updateDoc(doc(this.firestore, 'usuarios', uid), {
      rutasFavoritas: arrayUnion(rutaId),
    });
  }

  eliminarRutaFavorita(uid: string, rutaId: string) {
    return updateDoc(doc(this.firestore, 'usuarios', uid), {
      rutasFavoritas: arrayRemove(rutaId),
    });
  }

  normalizarRol(valor?: string | null): UserRole {
    if (valor === 'admin') {
      return 'admin';
    }

    return 'usuario';
  }
}
