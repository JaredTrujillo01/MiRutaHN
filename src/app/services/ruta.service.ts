import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  increment,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
  frecuencia: string;
  color: string;
  descripcion: string;
  puntosGuia?: Coordenada[];
  recorrido: Coordenada[];
  paradas: Parada[];
  estado: 'activa' | 'inactiva';

  publicadoDesdePropuesta?: boolean;
  propuestaOrigenId?: string;
  origenPropuestaId?: string;

  creadoPor?: string;
  creadoPorNombre?: string;
  creadoEn?: any;
  actualizadoEn?: any;
}

export type TipoPropuestaRuta = 'nueva' | 'actualizacion' | 'eliminacion';

export interface PropuestaRuta {
  id?: string;
  coleccionOrigen?: string;

  tipoPropuesta?: TipoPropuestaRuta;
  rutaOrigenId?: string;
  motivoCambio?: string;

  nombre: string;
  numero: string;
  precio: number;
  horario: string;
  frecuencia: string;
  color: string;
  descripcion: string;
  comentarios?: string;

  puntosGuia: Coordenada[];
  recorrido: Coordenada[];
  paradas: Parada[];

  estado: 'pendiente' | 'aprobada' | 'rechazada';

  creadoPor: string;
  creadoPorNombre: string;
  creadoEn: any;

  aprobaciones: number;
  rechazos: number;

  rutaPublicadaId?: string;
}

export type TipoValidacionRuta = 'aprobacion' | 'rechazo' | 'comentario';

export interface ValidacionRuta {
  id?: string;
  coleccionOrigen?: string;
  propuestaId: string;
  usuarioId: string;
  usuarioNombre: string;
  tipo: TipoValidacionRuta;
  comentario: string;
  creadoEn: any;
}

export interface NotaComunitaria {
  id?: string;
  coleccionOrigen?: string;
  rutaId: string;
  usuarioId: string;
  usuarioNombre: string;
  comentario: string;
  campoMarcado?: 'precio' | 'horario' | 'recorrido' | 'paradas' | 'descripcion' | 'otro' | 'ruta_falsa';
  estado: 'activa' | 'oculta';
  votosUtiles: number;
  confirmaciones: number;
  creadoEn: any;
}

export type TipoAccionNota = 'util' | 'confirmacion';

export interface AccionNota {
  id?: string;
  notaId: string;
  usuarioId: string;
  tipo: TipoAccionNota;
  creadoEn: any;
}

@Injectable({
  providedIn: 'root',
})
export class RutaService {
  private injector = inject(Injector);
  private firestore = inject(Firestore);

  private readonly propuestasCollection = 'propuestas_rutas';
  private readonly propuestasLegacyCollection = 'propuestasRutas';
  private readonly validacionesCollection = 'validaciones_rutas';
  private readonly validacionesLegacyCollection = 'validacionesRutas';
  private readonly notasCollection = 'notas_comunitarias';
  private readonly notasLegacyCollection = 'notasComunitarias';
  private readonly accionesNotasCollection = 'votos_notas';

  private inInjectionContext<T>(callback: () => T): T {
    return runInInjectionContext(this.injector, callback);
  }

  private collectionDataWithSource<T>(
    collectionName: string,
    consulta: any = collection(this.firestore, collectionName)
  ): Observable<T[]> {
    return collectionData(consulta, {
      idField: 'id',
    }).pipe(
      map((items) =>
        items.map((item) => ({
          ...item,
          coleccionOrigen: collectionName,
        })) as T[]
      ),
      catchError((error) => {
        console.warn(`No se pudo leer la colección ${collectionName}.`, error);
        return of([] as T[]);
      })
    );
  }

  private mergeById<T extends { id?: string }>(principal: T[], secundaria: T[]) {
    const items = new Map<string, T>();

    [...secundaria, ...principal].forEach((item) => {
      if (item.id) {
        items.set(item.id, item);
      }
    });

    return Array.from(items.values());
  }

  getRutas(): Observable<RutaTransporte[]> {
    return this.inInjectionContext(
      () =>
        collectionData(collection(this.firestore, 'rutas'), {
          idField: 'id',
        }) as Observable<RutaTransporte[]>
    );
  }

  createRuta(ruta: Omit<RutaTransporte, 'id'>) {
    return this.inInjectionContext(() =>
      addDoc(collection(this.firestore, 'rutas'), ruta)
    );
  }

  updateRuta(id: string, data: Partial<RutaTransporte>) {
    return this.inInjectionContext(() =>
      updateDoc(doc(this.firestore, 'rutas', id), {
        ...data,
        actualizadoEn: new Date(),
      })
    );
  }

  deleteRuta(id: string) {
    return this.inInjectionContext(() => deleteDoc(doc(this.firestore, 'rutas', id)));
  }

  desactivarRuta(id: string) {
    return this.inInjectionContext(() =>
      updateDoc(doc(this.firestore, 'rutas', id), {
        estado: 'inactiva',
        actualizadoEn: new Date(),
      })
    );
  }

  getPropuestasRuta(): Observable<PropuestaRuta[]> {
    return this.inInjectionContext(() =>
      combineLatest([
        this.collectionDataWithSource<PropuestaRuta>(this.propuestasCollection),
        this.collectionDataWithSource<PropuestaRuta>(
          this.propuestasLegacyCollection
        ),
      ]).pipe(
        map(([principal, legacy]) =>
          this.mergeById(principal, legacy).sort(
            (a, b) => this.fechaMillis(b.creadoEn) - this.fechaMillis(a.creadoEn)
          )
        )
      )
    );
  }

  createPropuestaRuta(propuesta: Omit<PropuestaRuta, 'id'>) {
    const sanitizedPropuesta = Object.fromEntries(
      Object.entries(propuesta).filter(([, value]) => value !== undefined)
    ) as Omit<PropuestaRuta, 'id'>;

    return this.inInjectionContext(() =>
      addDoc(collection(this.firestore, this.propuestasCollection), sanitizedPropuesta)
    );
  }

  updatePropuestaRuta(id: string, data: Partial<PropuestaRuta>) {
    return this.updateDocInCollections(
      [this.propuestasCollection, this.propuestasLegacyCollection],
      id,
      data
    );
  }

  rechazarPropuestaRuta(id: string) {
    return this.updatePropuestaRuta(id, {
      estado: 'rechazada',
    });
  }

  deletePropuestaRuta(id: string) {
    return this.deleteDocInCollections(
      [this.propuestasCollection, this.propuestasLegacyCollection],
      id
    );
  }

  crearPropuestaActualizacion(
    rutaOriginal: RutaTransporte,
    cambios: {
      nombre: string;
      numero: string;
      precio: number;
      horario: string;
      frecuencia: string;
      color: string;
      descripcion: string;
      puntosGuia: Coordenada[];
      recorrido: Coordenada[];
      paradas: Parada[];
    },
    usuario: {
      uid: string;
      nombre: string;
    },
    motivoCambio: string,
    creadoEn: any
  ) {
    const propuesta: Omit<PropuestaRuta, 'id'> = {
      tipoPropuesta: 'actualizacion',
      rutaOrigenId: rutaOriginal.id,
      motivoCambio,

      nombre: cambios.nombre,
      numero: cambios.numero,
      precio: cambios.precio,
      horario: cambios.horario,
      frecuencia: cambios.frecuencia,
      color: cambios.color,
      descripcion: cambios.descripcion,
      comentarios: motivoCambio,

      puntosGuia: cambios.puntosGuia,
      recorrido: cambios.recorrido,
      paradas: cambios.paradas,

      estado: 'pendiente',

      creadoPor: usuario.uid,
      creadoPorNombre: usuario.nombre,
      creadoEn,

      aprobaciones: 0,
      rechazos: 0,
    };

    return this.createPropuestaRuta(propuesta);
  }

  crearPropuestaEliminacion(
    rutaOriginal: RutaTransporte,
    usuario: {
      uid: string;
      nombre: string;
    },
    motivoCambio: string,
    creadoEn: any
  ) {
    const propuesta: Omit<PropuestaRuta, 'id'> = {
      tipoPropuesta: 'eliminacion',
      rutaOrigenId: rutaOriginal.id,
      motivoCambio,

      nombre: `[Eliminar] ${rutaOriginal.nombre}`,
      numero: rutaOriginal.numero,
      precio: Number(rutaOriginal.precio),
      horario: rutaOriginal.horario || 'No definido',
      frecuencia: rutaOriginal.frecuencia || 'No definida',
      color: rutaOriginal.color || '#dc2626',
      descripcion: `Solicitud para eliminar una ruta pública reportada como falsa o incorrecta.`,
      comentarios: motivoCambio,

      puntosGuia: rutaOriginal.puntosGuia || [],
      recorrido: rutaOriginal.recorrido || rutaOriginal.puntosGuia || [],
      paradas: rutaOriginal.paradas || [],

      estado: 'pendiente',

      creadoPor: usuario.uid,
      creadoPorNombre: usuario.nombre,
      creadoEn,

      aprobaciones: 0,
      rechazos: 0,
    };

    return this.createPropuestaRuta(propuesta);
  }

  getValidacionesPorPropuesta(propuestaId: string): Observable<ValidacionRuta[]> {
    return this.inInjectionContext(() =>
      combineLatest([
        this.collectionDataWithSource<ValidacionRuta>(
          this.validacionesCollection,
          query(
            collection(this.firestore, this.validacionesCollection),
            where('propuestaId', '==', propuestaId)
          )
        ),
        this.collectionDataWithSource<ValidacionRuta>(
          this.validacionesLegacyCollection,
          query(
            collection(this.firestore, this.validacionesLegacyCollection),
            where('propuestaId', '==', propuestaId)
          )
        ),
      ]).pipe(
        map(([principal, legacy]) =>
          this.mergeById(principal, legacy).sort(
            (a, b) => this.fechaMillis(b.creadoEn) - this.fechaMillis(a.creadoEn)
          )
        )
      )
    );
  }

  getValidacionesRuta(): Observable<ValidacionRuta[]> {
    return this.inInjectionContext(() =>
      combineLatest([
        this.collectionDataWithSource<ValidacionRuta>(
          this.validacionesCollection
        ),
        this.collectionDataWithSource<ValidacionRuta>(
          this.validacionesLegacyCollection
        ),
      ]).pipe(
        map(([principal, legacy]) =>
          this.mergeById(principal, legacy).sort(
            (a, b) => this.fechaMillis(b.creadoEn) - this.fechaMillis(a.creadoEn)
          )
        )
      )
    );
  }

  async createValidacionRuta(validacion: Omit<ValidacionRuta, 'id'>) {
    const propuestaParaAplicar = await this.inInjectionContext(() =>
      runTransaction(this.firestore, async (transaction) => {
        const propuestaRef = doc(
          this.firestore,
          this.propuestasCollection,
          validacion.propuestaId
        );
        const propuestaLegacyRef = doc(
          this.firestore,
          this.propuestasLegacyCollection,
          validacion.propuestaId
        );
        const propuestaSnap = await transaction.get(propuestaRef);
        const propuestaLegacySnap = propuestaSnap.exists()
          ? null
          : await transaction.get(propuestaLegacyRef);
        const propuestaActivaRef = propuestaSnap.exists()
          ? propuestaRef
          : propuestaLegacyRef;
        const propuestaActivaSnap = propuestaSnap.exists()
          ? propuestaSnap
          : propuestaLegacySnap;

        if (!propuestaActivaSnap?.exists()) {
          throw new Error('La propuesta no existe.');
        }

        const propuesta = propuestaActivaSnap.data() as PropuestaRuta;

        if (propuesta.estado !== 'pendiente') {
          throw new Error('Esta propuesta ya fue cerrada.');
        }

        const nuevasAprobaciones =
          validacion.tipo === 'aprobacion'
            ? (propuesta.aprobaciones || 0) + 1
            : propuesta.aprobaciones || 0;

        const nuevosRechazos =
          validacion.tipo === 'rechazo'
            ? (propuesta.rechazos || 0) + 1
            : propuesta.rechazos || 0;

        const validacionDoc = doc(
          collection(this.firestore, this.validacionesCollection)
        );

        transaction.set(validacionDoc, validacion);

        if (validacion.tipo === 'aprobacion') {
          transaction.update(propuestaActivaRef, {
            aprobaciones: increment(1),
          });
        }

        if (validacion.tipo === 'rechazo') {
          transaction.update(propuestaActivaRef, {
            rechazos: increment(1),
          });
        }

        if (nuevasAprobaciones >= APPROVAL_THRESHOLD) {
          transaction.update(propuestaActivaRef, {
            estado: 'aprobada',
          });
        }

        if (nuevosRechazos >= APPROVAL_THRESHOLD) {
          transaction.update(propuestaActivaRef, {
            estado: 'rechazada',
          });
        }

        if (
          validacion.tipo === 'aprobacion' &&
          nuevasAprobaciones >= APPROVAL_THRESHOLD
        ) {
          return {
            id: propuestaActivaRef.id,
            ...propuesta,
            aprobaciones: nuevasAprobaciones,
            rechazos: nuevosRechazos,
            estado: 'aprobada',
          } as PropuestaRuta;
        }

        return null;
      })
    );

    if (propuestaParaAplicar) {
      await this.aprobarPropuestaComoRuta(propuestaParaAplicar);
    }
  }

  async aprobarPropuestaComoRuta(propuesta: PropuestaRuta) {
    if (propuesta.rutaPublicadaId) {
      return propuesta.rutaPublicadaId;
    }

    if (propuesta.tipoPropuesta === 'actualizacion') {
      return this.aplicarActualizacionRuta(propuesta);
    }

    if (propuesta.tipoPropuesta === 'eliminacion') {
      return this.aplicarEliminacionRuta(propuesta);
    }

    const rutaCreada = await this.createRuta({
      nombre: propuesta.nombre,
      numero: propuesta.numero,
      precio: propuesta.precio,
      horario: propuesta.horario,
      frecuencia: propuesta.frecuencia,
      color: propuesta.color,
      descripcion: propuesta.descripcion,
      puntosGuia: propuesta.puntosGuia,
      recorrido: propuesta.recorrido,
      paradas: propuesta.paradas,
      estado: 'activa',
      publicadoDesdePropuesta: true,
      propuestaOrigenId: propuesta.id,
      creadoPor: propuesta.creadoPor,
      creadoPorNombre: propuesta.creadoPorNombre,
      creadoEn: propuesta.creadoEn,
      actualizadoEn: new Date(),
    });

    if (propuesta.id) {
      await this.updatePropuestaRuta(propuesta.id, {
        estado: 'aprobada',
        rutaPublicadaId: rutaCreada.id,
      });
    }

    return rutaCreada;
  }

  async aplicarActualizacionRuta(propuesta: PropuestaRuta) {
    if (!propuesta.rutaOrigenId) {
      throw new Error('La propuesta no tiene ruta de origen.');
    }

    await this.inInjectionContext(() =>
      updateDoc(doc(this.firestore, 'rutas', propuesta.rutaOrigenId!), {
        nombre: propuesta.nombre,
        numero: propuesta.numero,
        precio: propuesta.precio,
        horario: propuesta.horario,
        frecuencia: propuesta.frecuencia,
        color: propuesta.color,
        descripcion: propuesta.descripcion,
        puntosGuia: propuesta.puntosGuia,
        recorrido: propuesta.recorrido,
        paradas: propuesta.paradas,
        actualizadoEn: new Date(),
      })
    );

    if (propuesta.id) {
      await this.updatePropuestaRuta(propuesta.id, {
        estado: 'aprobada',
        rutaPublicadaId: propuesta.rutaOrigenId,
      });
    }

    return propuesta.rutaOrigenId;
  }

  async aplicarEliminacionRuta(propuesta: PropuestaRuta) {
    if (!propuesta.rutaOrigenId) {
      throw new Error('La propuesta no tiene ruta de origen.');
    }

    await this.inInjectionContext(() =>
      updateDoc(doc(this.firestore, 'rutas', propuesta.rutaOrigenId!), {
        estado: 'inactiva',
        actualizadoEn: new Date(),
      })
    );

    if (propuesta.id) {
      await this.updatePropuestaRuta(propuesta.id, {
        estado: 'aprobada',
        rutaPublicadaId: propuesta.rutaOrigenId,
      });
    }

    return propuesta.rutaOrigenId;
  }

  getNotasPorRuta(rutaId: string): Observable<NotaComunitaria[]> {
    return this.inInjectionContext(() =>
      combineLatest([
        this.collectionDataWithSource<NotaComunitaria>(
          this.notasCollection,
          query(
            collection(this.firestore, this.notasCollection),
            where('rutaId', '==', rutaId),
            where('estado', '==', 'activa')
          )
        ),
        this.collectionDataWithSource<NotaComunitaria>(
          this.notasLegacyCollection,
          query(
            collection(this.firestore, this.notasLegacyCollection),
            where('rutaId', '==', rutaId),
            where('estado', '==', 'activa')
          )
        ),
      ]).pipe(
        map(([principal, legacy]) =>
          this.mergeById(principal, legacy).sort(
            (a, b) => this.fechaMillis(b.creadoEn) - this.fechaMillis(a.creadoEn)
          )
        )
      )
    );
  }

  getNotasActivas(): Observable<NotaComunitaria[]> {
    return this.inInjectionContext(() =>
      combineLatest([
        this.collectionDataWithSource<NotaComunitaria>(
          this.notasCollection,
          query(
            collection(this.firestore, this.notasCollection),
            where('estado', '==', 'activa')
          )
        ),
        this.collectionDataWithSource<NotaComunitaria>(
          this.notasLegacyCollection,
          query(
            collection(this.firestore, this.notasLegacyCollection),
            where('estado', '==', 'activa')
          )
        ),
      ]).pipe(
        map(([principal, legacy]) =>
          this.mergeById(principal, legacy).sort(
            (a, b) => this.fechaMillis(b.creadoEn) - this.fechaMillis(a.creadoEn)
          )
        )
      )
    );
  }

  createNotaComunitaria(nota: Omit<NotaComunitaria, 'id'>) {
    return this.inInjectionContext(() =>
      addDoc(collection(this.firestore, this.notasCollection), nota)
    );
  }

  crearReporteRutaFalsa(
    ruta: RutaTransporte,
    usuario: { uid: string; nombre: string },
    comentario: string,
    creadoEn: any
  ) {
    if (!ruta.id) {
      throw new Error('La ruta no tiene identificador.');
    }

    return this.createNotaComunitaria({
      rutaId: ruta.id,
      usuarioId: usuario.uid,
      usuarioNombre: usuario.nombre,
      comentario,
      campoMarcado: 'ruta_falsa',
      estado: 'activa',
      votosUtiles: 0,
      confirmaciones: 0,
      creadoEn,
    });
  }

  getAccionesNotasUsuario(usuarioId: string): Observable<AccionNota[]> {
    return this.inInjectionContext(
      () =>
        collectionData(
          query(
            collection(this.firestore, this.accionesNotasCollection),
            where('usuarioId', '==', usuarioId)
          ),
          { idField: 'id' }
        ) as Observable<AccionNota[]>
    );
  }

  votarNotaUtil(id: string, usuarioId: string) {
    return this.registrarAccionNota(id, usuarioId, 'util');
  }

  confirmarNota(id: string, usuarioId: string) {
    return this.registrarAccionNota(id, usuarioId, 'confirmacion');
  }

  private registrarAccionNota(
    notaId: string,
    usuarioId: string,
    tipo: TipoAccionNota
  ) {
    return this.inInjectionContext(() =>
      runTransaction(this.firestore, async (transaction) => {
        const accionId = `${notaId}_${usuarioId}_${tipo}`;
        const accionRef = doc(
          this.firestore,
          this.accionesNotasCollection,
          accionId
        );
        const notaRef = doc(this.firestore, this.notasCollection, notaId);
        const notaLegacyRef = doc(
          this.firestore,
          this.notasLegacyCollection,
          notaId
        );

        const accionSnap = await transaction.get(accionRef);
        const notaSnap = await transaction.get(notaRef);
        const notaLegacySnap = notaSnap.exists()
          ? null
          : await transaction.get(notaLegacyRef);

        if (accionSnap.exists()) {
          throw new Error(
            tipo === 'util'
              ? 'Ya marcaste esta nota como util.'
              : 'Ya confirmaste esta nota.'
          );
        }

        const notaActivaRef = notaSnap.exists() ? notaRef : notaLegacyRef;
        const notaActivaSnap = notaSnap.exists() ? notaSnap : notaLegacySnap;

        if (!notaActivaSnap?.exists()) {
          throw new Error('La nota no existe.');
        }

        const nota = notaActivaSnap.data() as NotaComunitaria;
        const contador = tipo === 'util' ? 'votosUtiles' : 'confirmaciones';

        transaction.set(accionRef, {
          notaId,
          usuarioId,
          tipo,
          creadoEn: Timestamp.now(),
        });
        transaction.update(notaActivaRef, {
          [contador]: (nota[contador] || 0) + 1,
          actualizadoEn: Timestamp.now(),
        });
      })
    );
  }

  resolverNotaComunitaria(id: string) {
    return this.updateDocInCollections(
      [this.notasCollection, this.notasLegacyCollection],
      id,
      {
        estado: 'oculta',
      }
    );
  }

  ocultarNota(id: string) {
    return this.resolverNotaComunitaria(id);
  }

  private async updateDocInCollections(
    collectionNames: string[],
    id: string,
    data: object
  ) {
    let lastError: unknown;

    for (const collectionName of collectionNames) {
      try {
        return await this.inInjectionContext(() =>
          updateDoc(doc(this.firestore, collectionName, id), data)
        );
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  private async deleteDocInCollections(collectionNames: string[], id: string) {
    let lastError: unknown;

    for (const collectionName of collectionNames) {
      try {
        return await this.inInjectionContext(() =>
          deleteDoc(doc(this.firestore, collectionName, id))
        );
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  private fechaMillis(fecha: any) {
    if (!fecha) return 0;
    if (typeof fecha.toMillis === 'function') return fecha.toMillis();
    if (typeof fecha.toDate === 'function') return fecha.toDate().getTime();
    if (fecha instanceof Date) return fecha.getTime();
    return new Date(fecha).getTime() || 0;
  }
}
