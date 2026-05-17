import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface Parada {
  nombre: string;
  lat: number;
  lng: number;
  orden: number;
}

export interface RutaTransporte {
  id?: string;
  nombre: string;
  numero: string;
  precio: number;
  horario: string;
  color: string;
  estado: 'activa' | 'inactiva';
  descripcion?: string;
  puntosGuia?: Coordenada[];
  recorrido: Coordenada[];
  paradas: Parada[];
  creadoEn: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class RutaService {
  firestore = inject(Firestore);

  getRutas() {
    const rutasCollection = collection(this.firestore, 'rutas');
    const q = query(rutasCollection, orderBy('creadoEn', 'desc'));

    return collectionData(q, { idField: 'id' }) as Observable<RutaTransporte[]>;
  }

  createRuta(ruta: Omit<RutaTransporte, 'id'>) {
    const rutasCollection = collection(this.firestore, 'rutas');
    return addDoc(rutasCollection, ruta);
  }

  updateRuta(id: string, ruta: Partial<RutaTransporte>) {
    const rutaDoc = doc(this.firestore, 'rutas', id);
    return updateDoc(rutaDoc, ruta);
  }

  deleteRuta(id: string) {
    const rutaDoc = doc(this.firestore, 'rutas', id);
    return deleteDoc(rutaDoc);
  }
}