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
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Reporte {
  id?: string;
  usuarioId: string;
  usuarioNombre: string;
  tipo: 'retraso' | 'bus_lleno' | 'no_paso' | 'trafico' | 'accidente' | 'otros';
  rutaNombre: string;
  comentario: string;
  fotoUrl?: string;
  timestamp: Timestamp;
  votosUtiles: number;
  votosFalso: number;
  estado: 'activo' | 'confirmado' | 'falso' | 'resuelto';
}

@Injectable({
  providedIn: 'root',
})
export class ReporteService {
  firestore = inject(Firestore);

  getReportesActivos() {
    const reportesCollection = collection(this.firestore, 'reportes');
    const q = query(
      reportesCollection,
      where('estado', '==', 'activo'),
      orderBy('timestamp', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Reporte[]>;
  }

  createReporte(reporte: Omit<Reporte, 'id'>) {
    const reportesCollection = collection(this.firestore, 'reportes');
    return addDoc(reportesCollection, reporte);
  }

  deleteReporte(id: string) {
    const reportesCollection = collection(this.firestore, 'reportes');
    const reporteDoc = doc(reportesCollection, id);
    return deleteDoc(reporteDoc);
  }
}