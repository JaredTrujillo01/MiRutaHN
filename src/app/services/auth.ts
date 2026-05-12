import { Injectable } from '@angular/core';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';

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
  private auth = getAuth();
  private db = getFirestore();

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