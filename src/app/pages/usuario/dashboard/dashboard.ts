import { Component, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
export class Dashboard implements OnInit {
  paso = signal<number>(1);
  rutaSeleccionada = signal<any>(null);
  navegacionActiva = signal<boolean>(false);

  usuario: any = null;
  cargandoUsuario = true;

  rutasDemo = [
    {
      id: 1,
      nombre: 'Casa → Trabajo',
      ruta: 'Colonia Palmira a Centro Corporativo',
      precio: 'L. 15.00',
      tiempo: '25 min',
    },
    {
      id: 2,
      nombre: 'Casa → Universidad',
      ruta: 'Colonia Palmira a UNAH',
      precio: 'L. 13.00',
      tiempo: '45 min',
    },
    {
      id: 3,
      nombre: 'Mall → Casa',
      ruta: 'Multiplaza a Colonia Palmira',
      precio: 'L. 15.00',
      tiempo: '15 min',
    },
  ];

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    await this.cargarUsuario();

    this.route.queryParams.subscribe((params) => {
      const pasoParam = Number(params['paso']);
      const rutaId = Number(params['rutaId']);

      if (pasoParam === 4) {
        const ruta = this.rutasDemo.find((r) => r.id === rutaId);

        this.rutaSeleccionada.set(
          ruta || {
            id: rutaId || 0,
            nombre: 'Ruta seleccionada',
            ruta: 'Ruta guardada desde favoritos',
            precio: 'L. 15.00',
            tiempo: '25 min',
          }
        );

        this.paso.set(4);
        this.navegacionActiva.set(false);
      }
    });
  }

  async cargarUsuario() {
    const usuarioAuth = await this.authService.obtenerUsuarioActual();

    if (usuarioAuth) {
      this.usuario = await this.authService.obtenerPerfilUsuario(usuarioAuth.uid);
    }

    this.cargandoUsuario = false;
  }

  irAPaso(paso: number, ruta?: any) {
    this.paso.set(paso);

    if (ruta) {
      this.rutaSeleccionada.set(ruta);
    }

    if (paso !== 4) {
      this.navegacionActiva.set(false);
    }
  }

  onIniciarNavegacion() {
    this.navegacionActiva.set(true);
  }

  salirNavegacion() {
    this.navegacionActiva.set(false);
    this.paso.set(1);
    this.rutaSeleccionada.set(null);
  }
}