export interface Reporte {
  id?: string;
  usuarioId: string;
  usuarioNombre: string;
  rutaId: string;
  tipo: 'retraso' | 'desvio' | 'lleno' | 'accidente' | 'otro';
  descripcion: string;
  estado: 'activo' | 'resuelto' | 'rechazado';
  fechaCreacion: Date;
  votos: number;
}
