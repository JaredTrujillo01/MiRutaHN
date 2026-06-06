import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import {
  addDoc,
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
export type EstadoUsuario =
  | 'activo'
  | 'suspendido_temporal'
  | 'suspendido_permanente';

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
  estadoUsuario?: EstadoUsuario;
  motivoSuspension?: string;
  suspendidoPor?: string;
  suspendidoEn?: any;
  suspensionHasta?: any;
  reportesFalsos?: number;
}

interface DatosAuditoriaUsuario {
  tipoAccion: 'suspension_temporal' | 'suspension_permanente' | 'reactivacion';
  usuarioAfectadoId: string;
  usuarioAfectadoNombre?: string;
  adminId: string;
  motivo: string;
  estadoAnterior: EstadoUsuario;
  estadoNuevo: EstadoUsuario;
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

  normalizarEstadoUsuario(valor?: string | null): EstadoUsuario {
    if (valor === 'suspendido_temporal') {
      return 'suspendido_temporal';
    }

    if (valor === 'suspendido_permanente') {
      return 'suspendido_permanente';
    }

    return 'activo';
  }

  estadoUsuarioActual(perfil?: PerfilUsuario | null): EstadoUsuario {
    const estado = this.normalizarEstadoUsuario(perfil?.estadoUsuario);

    if (estado !== 'suspendido_temporal') {
      return estado;
    }

    const suspensionHasta = this.fechaMillis(perfil?.suspensionHasta);

    if (suspensionHasta > 0 && suspensionHasta <= Date.now()) {
      return 'activo';
    }

    return 'suspendido_temporal';
  }

  estaSuspendido(perfil?: PerfilUsuario | null): boolean {
    return this.estadoUsuarioActual(perfil) !== 'activo';
  }

  async suspenderTemporalmente(
    usuario: PerfilUsuario,
    adminId: string,
    motivo: string,
    suspensionHasta: Date
  ) {
    const estadoAnterior = this.estadoUsuarioActual(usuario);

    await updateDoc(doc(this.firestore, 'usuarios', usuario.uid), {
      estadoUsuario: 'suspendido_temporal',
      motivoSuspension: motivo,
      suspendidoPor: adminId,
      suspendidoEn: new Date(),
      suspensionHasta,
    });

    return this.registrarAccionAdmin({
      tipoAccion: 'suspension_temporal',
      usuarioAfectadoId: usuario.uid,
      usuarioAfectadoNombre: usuario.nombre || usuario.email,
      adminId,
      motivo,
      estadoAnterior,
      estadoNuevo: 'suspendido_temporal',
    });
  }

  async suspenderPermanentemente(
    usuario: PerfilUsuario,
    adminId: string,
    motivo: string
  ) {
    const estadoAnterior = this.estadoUsuarioActual(usuario);

    await updateDoc(doc(this.firestore, 'usuarios', usuario.uid), {
      estadoUsuario: 'suspendido_permanente',
      motivoSuspension: motivo,
      suspendidoPor: adminId,
      suspendidoEn: new Date(),
      suspensionHasta: null,
    });

    return this.registrarAccionAdmin({
      tipoAccion: 'suspension_permanente',
      usuarioAfectadoId: usuario.uid,
      usuarioAfectadoNombre: usuario.nombre || usuario.email,
      adminId,
      motivo,
      estadoAnterior,
      estadoNuevo: 'suspendido_permanente',
    });
  }

  async reactivarUsuario(
    usuario: PerfilUsuario,
    adminId: string,
    motivo = 'Usuario reactivado por administracion.'
  ) {
    const estadoAnterior = this.estadoUsuarioActual(usuario);

    await updateDoc(doc(this.firestore, 'usuarios', usuario.uid), {
      estadoUsuario: 'activo',
      motivoSuspension: '',
      suspensionHasta: null,
    });

    return this.registrarAccionAdmin({
      tipoAccion: 'reactivacion',
      usuarioAfectadoId: usuario.uid,
      usuarioAfectadoNombre: usuario.nombre || usuario.email,
      adminId,
      motivo,
      estadoAnterior,
      estadoNuevo: 'activo',
    });
  }

  private registrarAccionAdmin(data: DatosAuditoriaUsuario) {
    return addDoc(collection(this.firestore, 'admin_acciones'), {
      ...data,
      fecha: new Date(),
    });
  }

  private fechaMillis(fecha: any) {
    if (!fecha) return 0;
    if (typeof fecha.toMillis === 'function') return fecha.toMillis();
    if (typeof fecha.toDate === 'function') return fecha.toDate().getTime();
    if (fecha instanceof Date) return fecha.getTime();
    return new Date(fecha).getTime() || 0;
  }
}
