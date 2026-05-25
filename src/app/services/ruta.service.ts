import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
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
import { map } from 'rxjs/operators';

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
  frecuencia?: string;
  color: string;
  estado: 'activa' | 'inactiva';
  descripcion?: string;
  puntosGuia?: Coordenada[];
  recorrido: Coordenada[];
  paradas: Parada[];
  creadoEn: Timestamp;
  origenPropuestaId?: string;
  publicadoDesdePropuesta?: boolean;
}

export type EstadoPropuestaRuta = 'pendiente' | 'aprobada' | 'rechazada';
export type TipoValidacionRuta = 'aprobacion' | 'rechazo' | 'comentario';

export interface PropuestaRuta {
  id?: string;
  nombre: string;
  numero: string;
  precio: number;
  horario: string;
  frecuencia?: string;
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
  comentario?: string;
  creadoEn: Timestamp;
}

export interface NotaComunitaria {
  id?: string;
  rutaId: string;
  usuarioId: string;
  usuarioNombre: string;
  comentario: string;
  campoMarcado?: 'precio' | 'horario' | 'frecuencia' | 'recorrido' | 'paradas' | 'otro';
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
  private injector = inject(Injector);
  private firestore = inject(Firestore);

  getRutas() {
    const rutasCollection = collection(this.firestore, 'rutas');
    const q = query(rutasCollection, orderBy('creadoEn', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<RutaTransporte[]>;
  }

  createRuta(ruta: Omit<RutaTransporte, 'id'>) {
    return addDoc(collection(this.firestore, 'rutas'), ruta);
  }

  updateRuta(id: string, ruta: Partial<RutaTransporte>) {
    return updateDoc(doc(this.firestore, 'rutas', id), ruta);
  }

  deleteRuta(id: string) {
    return deleteDoc(doc(this.firestore, 'rutas', id));
  }

  getPropuestasRuta() {
    return runInInjectionContext(this.injector, () => {
      const propuestasCollection = collection(this.firestore, 'propuestas_rutas');
      const q = query(propuestasCollection, orderBy('creadoEn', 'desc'));
      return collectionData(q, { idField: 'id' }) as Observable<PropuestaRuta[]>;
    });
  }

  createPropuestaRuta(propuesta: Omit<PropuestaRuta, 'id'>) {
    return addDoc(collection(this.firestore, 'propuestas_rutas'), propuesta);
  }

  updatePropuestaRuta(id: string, propuesta: Partial<PropuestaRuta>) {
    return updateDoc(doc(this.firestore, 'propuestas_rutas', id), propuesta);
  }

  deletePropuestaRuta(id: string) {
    return deleteDoc(doc(this.firestore, 'propuestas_rutas', id));
  }

  getValidacionesPorPropuesta(propuestaId: string) {
    return runInInjectionContext(this.injector, () => {
      const validacionesCollection = collection(this.firestore, 'validaciones_rutas');
      const q = query(
        validacionesCollection,
        where('propuestaId', '==', propuestaId)
      );

      return (collectionData(q, { idField: 'id' }) as Observable<ValidacionRuta[]>).pipe(
        map((validaciones) =>
          validaciones.sort(
            (a, b) => b.creadoEn.toMillis() - a.creadoEn.toMillis()
          )
        )
      );
    });
  }

  async createValidacionRuta(validacion: Omit<ValidacionRuta, 'id'>) {
    if (validacion.tipo !== 'comentario') {
      await this.validarVotoUnico(validacion.propuestaId, validacion.usuarioId);
    }

    await addDoc(collection(this.firestore, 'validaciones_rutas'), validacion);

    const propuestaDoc = doc(this.firestore, 'propuestas_rutas', validacion.propuestaId);

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
      actualizadoEn: Timestamp.now(),
    });
  }

  getNotasPorRuta(rutaId: string) {
    const notasCollection = collection(this.firestore, 'notas_comunitarias');
    const q = query(
      notasCollection,
      where('rutaId', '==', rutaId),
      where('estado', '==', 'activa'),
      orderBy('creadoEn', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<NotaComunitaria[]>;
  }

  getNotasActivas() {
    const notasCollection = collection(this.firestore, 'notas_comunitarias');
    const q = query(
      notasCollection,
      where('estado', '==', 'activa'),
      orderBy('creadoEn', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<NotaComunitaria[]>;
  }

  createNotaComunitaria(nota: Omit<NotaComunitaria, 'id'>) {
    return addDoc(collection(this.firestore, 'notas_comunitarias'), nota);
  }

  votarNotaUtil(id: string) {
    return updateDoc(doc(this.firestore, 'notas_comunitarias', id), {
      votosUtiles: increment(1),
      actualizadoEn: Timestamp.now(),
    });
  }

  confirmarNota(id: string) {
    return updateDoc(doc(this.firestore, 'notas_comunitarias', id), {
      confirmaciones: increment(1),
      actualizadoEn: Timestamp.now(),
    });
  }

  resolverNotaComunitaria(id: string) {
    return updateDoc(doc(this.firestore, 'notas_comunitarias', id), {
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

    if (!snapshot.exists()) return;

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
