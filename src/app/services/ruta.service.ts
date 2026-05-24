import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export const APPROVAL_THRESHOLD = 10;

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
  frecuencia?: string;
  origenPropuestaId?: string;
  publicadoDesdePropuesta?: boolean;
  puntosGuia?: Coordenada[];
  recorrido: Coordenada[];
  paradas: Parada[];
  creadoEn: Timestamp;
}

export type EstadoPropuestaRuta = 'pendiente' | 'aprobada' | 'rechazada';
export type TipoValidacionRuta = 'aprobacion' | 'rechazo' | 'comentario';

export interface PropuestaRuta {
  id?: string;
  nombre: string;
  numero: string;
  precio: number;
  horario: string;
  frecuencia: string;
  color: string;
  descripcion?: string;
  comentarios?: string;
  puntosGuia?: Coordenada[];
  recorrido: Coordenada[];
  paradas: Parada[];
  estado: EstadoPropuestaRuta;
  creadoPor: string;
  creadoPorNombre: string;
  creadoEn: Timestamp;
  actualizadoEn?: Timestamp;
  aprobaciones: number;
  rechazos: number;
  rutaPublicadaId?: string;
}

export interface ValidacionRuta {
  id?: string;
  propuestaId: string;
  usuarioId: string;
  usuarioNombre: string;
  tipo: TipoValidacionRuta;
  comentario: string;
  creadoEn: Timestamp;
}

export interface NotaComunitaria {
  id?: string;
  rutaId: string;
  usuarioId: string;
  usuarioNombre: string;
  comentario: string;
  campoMarcado?: 'precio' | 'horario' | 'recorrido' | 'paradas' | 'descripcion' | 'otro';
  estado: 'activa' | 'resuelta';
  votosUtiles: number;
  confirmaciones: number;
  creadoEn: Timestamp;
  actualizadoEn?: Timestamp;
}

export type EstadoPropuestaRuta = 'pendiente' | 'aprobada' | 'rechazada';
export type TipoValidacionRuta = 'aprobacion' | 'rechazo' | 'comentario';

export interface PropuestaRuta {
  id?: string;
  nombre: string;
  numero: string;
  precio: number;
  horario: string;
  frecuencia: string;
  color: string;
  descripcion?: string;
  comentarios?: string;
  puntosGuia?: Coordenada[];
  recorrido: Coordenada[];
  paradas: Parada[];
  estado: EstadoPropuestaRuta;
  creadoPor: string;
  creadoPorNombre: string;
  creadoEn: Timestamp;
  actualizadoEn?: Timestamp;
  aprobaciones: number;
  rechazos: number;
}

export interface ValidacionRuta {
  id?: string;
  propuestaId: string;
  usuarioId: string;
  usuarioNombre: string;
  tipo: TipoValidacionRuta;
  comentario: string;
  creadoEn: Timestamp;
}

export interface NotaComunitaria {
  id?: string;
  rutaId: string;
  usuarioId: string;
  usuarioNombre: string;
  comentario: string;
  campoMarcado?: 'precio' | 'horario' | 'recorrido' | 'paradas' | 'descripcion' | 'otro';
  estado: 'activa' | 'resuelta';
  votosUtiles: number;
  confirmaciones: number;
  creadoEn: Timestamp;
  actualizadoEn?: Timestamp;
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

  getPropuestasRuta() {
    const propuestasCollection = collection(this.firestore, 'propuestas_rutas');
    const q = query(propuestasCollection, orderBy('creadoEn', 'desc'));

    return collectionData(q, { idField: 'id' }) as Observable<PropuestaRuta[]>;
  }

  createPropuestaRuta(propuesta: Omit<PropuestaRuta, 'id'>) {
    const propuestasCollection = collection(this.firestore, 'propuestas_rutas');
    return addDoc(propuestasCollection, propuesta);
  }

  updatePropuestaRuta(id: string, propuesta: Partial<PropuestaRuta>) {
    const propuestaDoc = doc(this.firestore, 'propuestas_rutas', id);
    return updateDoc(propuestaDoc, propuesta);
  }

  deletePropuestaRuta(id: string) {
    const propuestaDoc = doc(this.firestore, 'propuestas_rutas', id);
    return deleteDoc(propuestaDoc);
  }

  getValidacionesPorPropuesta(propuestaId: string) {
    const validacionesCollection = collection(this.firestore, 'validaciones_rutas');
    const q = query(validacionesCollection, where('propuestaId', '==', propuestaId));
  getValidacionesPorPropuesta(propuestaId: string) {
    const validacionesCollection = collection(this.firestore, 'validaciones_rutas');
    const q = query(
      validacionesCollection,
      where('propuestaId', '==', propuestaId)
    );

    return collectionData(q, { idField: 'id' }) as Observable<ValidacionRuta[]>;
  }

  async createValidacionRuta(validacion: Omit<ValidacionRuta, 'id'>) {
    if (validacion.tipo !== 'comentario') {
      await this.validarVotoUnico(validacion.propuestaId, validacion.usuarioId);
    }

    const validacionesCollection = collection(this.firestore, 'validaciones_rutas');
    const propuestaDoc = doc(this.firestore, 'propuestas_rutas', validacion.propuestaId);

    await addDoc(validacionesCollection, validacion);

    if (validacion.tipo === 'aprobacion') {
      await updateDoc(propuestaDoc, {
        aprobaciones: increment(1),
        actualizadoEn: Timestamp.now(),
      });

      await this.publicarSiAlcanzaUmbral(validacion.propuestaId);
    }

    if (validacion.tipo === 'rechazo') {
      await updateDoc(propuestaDoc, {
        rechazos: increment(1),
        actualizadoEn: Timestamp.now(),
      });
    }
  }

  async aprobarPropuestaComoRuta(propuesta: PropuestaRuta) {
    if (!propuesta.id) {
      throw new Error('La propuesta no tiene identificador.');
    }

    if (propuesta.rutaPublicadaId) {
      await this.updatePropuestaRuta(propuesta.id, {
        estado: 'aprobada',
        actualizadoEn: Timestamp.now(),
      });
      return propuesta.rutaPublicadaId;
    }

    const rutaPublica: Omit<RutaTransporte, 'id'> = {
      nombre: propuesta.nombre,
      numero: propuesta.numero,
      precio: Number(propuesta.precio),
      horario: propuesta.horario,
      frecuencia: propuesta.frecuencia,
      color: propuesta.color,
      estado: 'activa',
      descripcion: propuesta.descripcion,
      puntosGuia: propuesta.puntosGuia || [],
      recorrido: propuesta.recorrido || [],
      paradas: propuesta.paradas || [],
      origenPropuestaId: propuesta.id,
      publicadoDesdePropuesta: true,
      creadoEn: Timestamp.now(),
    };

    const rutaRef = await this.createRuta(rutaPublica);

    await this.updatePropuestaRuta(propuesta.id, {
      estado: 'aprobada',
      rutaPublicadaId: rutaRef.id,
      actualizadoEn: Timestamp.now(),
    });

    return rutaRef.id;
  }

  async rechazarPropuestaRuta(id: string) {
    return this.updatePropuestaRuta(id, {
      estado: 'rechazada',
      creadoEn: Timestamp.now(),
    };

    await this.createRuta(rutaPublica);
    await this.updatePropuestaRuta(propuesta.id, {
      estado: 'aprobada',
      actualizadoEn: Timestamp.now(),
    });
  }

  getNotasPorRuta(rutaId: string) {
    const notasCollection = collection(this.firestore, 'notas_comunitarias');
    const q = query(
      notasCollection,
      where('rutaId', '==', rutaId),
      where('estado', '==', 'activa')
    );

    return collectionData(q, { idField: 'id' }) as Observable<NotaComunitaria[]>;
  }

  getNotasActivas() {
    const notasCollection = collection(this.firestore, 'notas_comunitarias');
    const q = query(notasCollection, where('estado', '==', 'activa'));
    const q = query(
      notasCollection,
      where('estado', '==', 'activa')
    );

    return collectionData(q, { idField: 'id' }) as Observable<NotaComunitaria[]>;
  }

  createNotaComunitaria(nota: Omit<NotaComunitaria, 'id'>) {
    const notasCollection = collection(this.firestore, 'notas_comunitarias');
    return addDoc(notasCollection, nota);
  }

  votarNotaUtil(id: string) {
    const notaDoc = doc(this.firestore, 'notas_comunitarias', id);

    return updateDoc(notaDoc, {
      votosUtiles: increment(1),
      actualizadoEn: Timestamp.now(),
    });
  }

  confirmarNota(id: string) {
    const notaDoc = doc(this.firestore, 'notas_comunitarias', id);

    return updateDoc(notaDoc, {
      confirmaciones: increment(1),
      actualizadoEn: Timestamp.now(),
    });
  }

  resolverNotaComunitaria(id: string) {
    const notaDoc = doc(this.firestore, 'notas_comunitarias', id);

    return updateDoc(notaDoc, {
      estado: 'resuelta',
      actualizadoEn: Timestamp.now(),
    });
  }

  private async validarVotoUnico(propuestaId: string, usuarioId: string) {
    const validacionesCollection = collection(this.firestore, 'validaciones_rutas');
    const q = query(
      validacionesCollection,
      where('propuestaId', '==', propuestaId),
      where('usuarioId', '==', usuarioId)
    );
    const snapshot = await getDocs(q);
    const yaVoto = snapshot.docs.some((documento) => {
      const data = documento.data() as ValidacionRuta;
      return data.tipo === 'aprobacion' || data.tipo === 'rechazo';
    });

    if (yaVoto) {
      throw new Error('Ya validaste esta propuesta.');
    }
  }

  private async publicarSiAlcanzaUmbral(propuestaId: string) {
    const propuestaDoc = doc(this.firestore, 'propuestas_rutas', propuestaId);
    const snapshot = await getDoc(propuestaDoc);

    if (!snapshot.exists()) {
      return;
    }

    const propuesta = {
      id: snapshot.id,
      ...snapshot.data(),
    } as PropuestaRuta;

    if (
      propuesta.estado === 'pendiente' &&
      !propuesta.rutaPublicadaId &&
      propuesta.aprobaciones >= APPROVAL_THRESHOLD
    ) {
      await this.aprobarPropuestaComoRuta(propuesta);
    }
  }
}
