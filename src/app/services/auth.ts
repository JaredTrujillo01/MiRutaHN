import { Injectable, inject } from '@angular/core';
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
import { doc, Firestore, getDoc, setDoc } from '@angular/fire/firestore';

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
  private auth = inject(Auth);
  private db = inject(Firestore);

  loginUsuario(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  cerrarSesion() {
    return signOut(this.auth);
  }

  obtenerUsuarioActual(): Promise<User | null> {
    return new Promise((resolve) => {
      const usuarioActual = this.auth.currentUser;

      if (usuarioActual) {
        resolve(usuarioActual);
        return;
      }

      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(this.auth.currentUser);
      }, 3000);

      const unsubscribe = onAuthStateChanged(
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
      );
    });
  }

  async obtenerPerfilUsuario(uid: string) {
    const referencia = doc(this.db, 'usuarios', uid);
    const documento = await getDoc(referencia);

    if (!documento.exists()) {
      return null;
    }

    return documento.data();
  }

  async registrarUsuario(usuario: RegistroUsuario) {
    const credenciales = await createUserWithEmailAndPassword(
      this.auth,
      usuario.email,
      usuario.password
    );

    await setDoc(doc(this.db, 'usuarios', credenciales.user.uid), {
      uid: credenciales.user.uid,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      ciudad: usuario.ciudad,
      rol: 'ciudadano',
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