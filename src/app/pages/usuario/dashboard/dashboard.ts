import { Component, signal, OnInit } from '@angular/core';
import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { ParadasCercanas } from '../../../components/paradas-cercanas/paradas-cercanas';
import { Buscar } from '../../../components/buscar/buscar';
import { ResultadosBusqueda } from '../../../components/resultados-busqueda/resultados-busqueda';
import { DetalleRuta } from '../../../components/detalle-ruta/detalle-ruta';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-dashboard',
  imports: [Sidebar, ParadasCercanas, Buscar, ResultadosBusqueda, DetalleRuta],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})

export class Dashboard implements OnInit{
  paso = signal<number>(1);
  rutaSeleccionada = signal<any>(null);
  navegacionActiva = signal<boolean>(false);

  usuario: any = null;
  cargandoUsuario = true;

  constructor(private authService: AuthService) {}
   
  async ngOnInit() {
    const usuarioAuth = await this.authService.obtenerUsuarioActual();

    console.log('Usuario Auth:', usuarioAuth);

    if (usuarioAuth) {
      this.usuario = await this.authService.obtenerPerfilUsuario(usuarioAuth.uid);
      console.log('Perfil Firestore:', this.usuario);
    }

  this.cargandoUsuario = false;
  }


  irAPaso(paso: number, ruta?: any) {
    this.paso.set(paso);
    if (ruta) {
      this.rutaSeleccionada.set(ruta);
    }
    // Resetear navegación al salir del paso 4
    if (paso !== 4) {
      this.navegacionActiva.set(false);
    }
  }

  onIniciarNavegacion() {
    this.navegacionActiva.set(true);
  }

  salirNavegacion() {
    this.navegacionActiva.set(false);
    this.paso.set(1); // Volver al inicio
    this.rutaSeleccionada.set(null); // Limpiar ruta seleccionada
  }
}