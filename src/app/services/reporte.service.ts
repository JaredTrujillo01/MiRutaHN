import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  increment
} from '@angular/fire/firestore';
import { Reporte } from '../models/reporte.model';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private firestore = inject(Firestore);
  private col = collection(this.firestore, 'reportes');

  async crearReporte(reporte: Omit<Reporte, 'id'>): Promise<string> {
    const ref = await addDoc(this.col, {
      ...reporte,
      estado: 'activo',
      votos: 0,
      fechaCreacion: new Date()
    });
    return ref.id;
  }

  async obtenerReportes(): Promise<Reporte[]> {
    const q = query(
      this.col,
      where('estado', '==', 'activo'),
      orderBy('fechaCreacion', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Reporte);
  }

  async obtenerReporte(id: string): Promise<Reporte | null> {
    const ref = doc(this.col, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Reporte;
    }
    return null;
  }

  async obtenerReportesPorUsuario(uid: string): Promise<Reporte[]> {
    const q = query(
      this.col,
      where('usuarioId', '==', uid),
      orderBy('fechaCreacion', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Reporte);
  }

  async actualizarReporte(id: string, datos: Partial<Reporte>): Promise<void> {
    const ref = doc(this.col, id);
    await updateDoc(ref, datos as Record<string, any>);
  }

  async votarReporte(id: string): Promise<void> {
    const ref = doc(this.col, id);
    await updateDoc(ref, { votos: increment(1) });
  }

  async eliminarReporte(id: string): Promise<void> {
    const ref = doc(this.col, id);
    await deleteDoc(ref);
  }
}
