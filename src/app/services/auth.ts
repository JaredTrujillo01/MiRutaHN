import { Injectable, inject } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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

  obtenerUsuarioActual(): Promise<User | null> {
    return new Promise((resolve) => {
      onAuthStateChanged(this.auth, (user) => {
        resolve(user);
      });
    });
  }

  async obtenerPerfilUsuario(uid: string) {
    const documento = await getDoc(doc(this.db, 'usuarios', uid));

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
      creadoEn: new Date(),
    });

    return credenciales;
  }
}
