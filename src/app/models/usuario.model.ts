export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: 'usuario' | 'admin';
  fechaRegistro: Date;
  rutasFavoritas?: string[];
}
