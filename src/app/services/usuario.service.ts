import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private firestore = inject(Firestore);
  private col = collection(this.firestore, 'usuarios');

  async crearUsuario(usuario: Usuario): Promise<void> {
    const ref = doc(this.col, usuario.uid);
    await setDoc(ref, {
      ...usuario,
      fechaRegistro: new Date(),
      rutasFavoritas: []
    });
  }

  async obtenerUsuario(uid: string): Promise<Usuario | null> {
    const ref = doc(this.col, uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as Usuario;
    }
    return null;
  }

  async obtenerTodos(): Promise<Usuario[]> {
    const q = query(this.col, orderBy('fechaRegistro', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), uid: d.id }) as Usuario);
  }

  async actualizarUsuario(uid: string, datos: Partial<Usuario>): Promise<void> {
    const ref = doc(this.col, uid);
    await updateDoc(ref, datos as Record<string, any>);
  }

  async eliminarUsuario(uid: string): Promise<void> {
    const ref = doc(this.col, uid);
    await deleteDoc(ref);
  }
}
