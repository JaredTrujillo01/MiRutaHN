import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import {
  Coordenada,
  Parada,
  PropuestaRuta,
  RutaService,
  RutaTransporte,
} from '../../../services/ruta.service';
import { AuthService } from '../../../services/auth';
import { AuthRequiredModal } from '../../../components/auth-required-modal/auth-required-modal';

type TipoSolicitudRuta = 'actualizacion' | 'eliminacion';

interface EditorActualizacion {
  nombre: string;
  numero: string;
  precio: number;
  horario: string;
  frecuencia: string;
  color: string;
  descripcion: string;
}

@Component({
  selector: 'app-rutas-publicas',
  imports: [FormsModule, Sidebar, AuthRequiredModal],
  templateUrl: './rutas-publicas.html',
  styleUrl: './rutas-publicas.scss',
})
export class RutasPublicas implements AfterViewInit, OnDestroy {
  @ViewChildren('miniMapa') miniMapaRefs!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChild('editorMapa') editorMapaRef?: ElementRef<HTMLDivElement>;

  private rutaService = inject(RutaService);
  private authService = inject(AuthService);
  private router = inject(Router);

  rutas = signal<RutaTransporte[]>([]);
  actualizacionesPendientes = signal<PropuestaRuta[]>([]);
  cargando = signal(true);
  error = signal('');
  filtro = signal('');

  usuarioId = signal<string | null>(null);
  usuarioNombre = signal('Ciudadano');

  mostrarModalAuth = signal(false);
  guardandoSolicitud = signal(false);

  rutaSeleccionada = signal<RutaTransporte | null>(null);
  tipoSolicitud = signal<TipoSolicitudRuta>('actualizacion');
  comentarioSolicitud = signal('');

  mensajeExito = signal('');
  mensajeError = signal('');

  editor = signal<EditorActualizacion>({
    nombre: '',
    numero: '',
    precio: 0,
    horario: '',
    frecuencia: '',
    color: '#2563eb',
    descripcion: '',
  });

  puntosGuia = signal<Coordenada[]>([]);
  recorrido = signal<Coordenada[]>([]);
  paradas = signal<Parada[]>([]);

  private miniMaps = new Map<string, L.Map>();
  private editorMap?: L.Map;
  private editorRutaLayer = L.layerGroup();
  private editorParadasLayer = L.layerGroup();

  rutasFiltradas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const activas = this.rutas().filter((ruta) => ruta.estado === 'activa');

    if (!texto) return activas;

    return activas.filter((ruta) =>
      [
        ruta.nombre,
        ruta.numero,
        ruta.descripcion,
        ruta.horario,
        ruta.frecuencia,
        ruta.precio,
        ...(ruta.paradas || []).map((parada) => parada.nombre),
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto)
    );
  });

  constructor() {
    this.cargarUsuario();

    this.rutaService
      .getRutas()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (rutas) => {
          this.rutas.set(rutas);
          this.cargando.set(false);

          setTimeout(() => this.inicializarMiniMapas(), 250);
        },
        error: () => {
          this.error.set('No se pudieron cargar las rutas públicas.');
          this.cargando.set(false);
        },
      });

    this.rutaService
      .getPropuestasRuta()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (propuestas) => {
          this.actualizacionesPendientes.set(
            propuestas.filter(
              (propuesta) =>
                propuesta.tipoPropuesta === 'actualizacion' &&
                propuesta.estado === 'pendiente' &&
                Boolean(propuesta.rutaOrigenId)
            )
          );
        },
        error: (err) => console.error(err),
      });
  }

  ngAfterViewInit() {
    this.miniMapaRefs.changes.subscribe(() => {
      setTimeout(() => this.inicializarMiniMapas(), 150);
    });
  }

  ngOnDestroy() {
    this.miniMaps.forEach((mapa) => {
      mapa.off();
      mapa.remove();
    });
    this.miniMaps.clear();

    this.editorMap?.off();
    this.editorMap?.remove();
  }

  async cargarUsuario() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.usuarioId.set(usuario?.uid ?? null);

    if (!usuario) return;

    const perfil = await this.authService.obtenerPerfilUsuario(usuario.uid);
    this.usuarioNombre.set(perfil?.nombre || usuario.email || 'Ciudadano');
  }

  actualizarFiltro(valor: string) {
    this.filtro.set(valor);
    setTimeout(() => this.inicializarMiniMapas(), 100);
  }

  inicializarMiniMapas() {
    this.miniMaps.forEach((mapa) => mapa.remove());
    this.miniMaps.clear();

    this.miniMapaRefs.forEach((ref) => {
      const contenedor = ref.nativeElement;
      const rutaId = contenedor.dataset['rutaId'];
      const ruta = this.rutasFiltradas().find((item) => item.id === rutaId);

      if (!ruta || !ruta.id || contenedor.clientHeight === 0) return;

      const mapa = L.map(contenedor, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      }).setView([15.5042, -88.025], 13);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapa);

      const puntos = this.obtenerPuntosRuta(ruta);

      if (puntos.length > 0) {
        L.polyline(puntos, {
          color: ruta.color || '#2563eb',
          weight: 5,
          opacity: 0.95,
        }).addTo(mapa);

        mapa.fitBounds(L.latLngBounds(puntos), {
          padding: [20, 20],
        });
      }

      ruta.paradas?.forEach((parada) => {
        L.circleMarker([parada.lat, parada.lng], {
          radius: 5,
          color: '#16a34a',
          fillColor: '#16a34a',
          fillOpacity: 1,
          weight: 2,
        }).addTo(mapa);
      });

      setTimeout(() => mapa.invalidateSize(), 150);
      this.miniMaps.set(ruta.id, mapa);
    });
  }

  obtenerPuntosRuta(ruta: RutaTransporte): [number, number][] {
    const puntos =
      ruta.recorrido && ruta.recorrido.length > 0
        ? ruta.recorrido
        : ruta.puntosGuia || [];

    return puntos.map((punto) => [punto.lat, punto.lng] as [number, number]);
  }

  abrirSolicitud(ruta: RutaTransporte, tipo: TipoSolicitudRuta) {
    if (!this.usuarioId()) {
      this.mostrarModalAuth.set(true);
      return;
    }

    this.rutaSeleccionada.set(ruta);
    this.tipoSolicitud.set(tipo);
    this.comentarioSolicitud.set('');
    this.mensajeExito.set('');
    this.mensajeError.set('');

    this.editor.set({
      nombre: ruta.nombre,
      numero: ruta.numero,
      precio: Number(ruta.precio || 0),
      horario: ruta.horario || '',
      frecuencia: ruta.frecuencia || '',
      color: ruta.color || '#2563eb',
      descripcion: ruta.descripcion || '',
    });

    this.puntosGuia.set([...(ruta.puntosGuia || [])]);
    this.recorrido.set([...(ruta.recorrido || ruta.puntosGuia || [])]);
    this.paradas.set([...(ruta.paradas || [])]);

  }

  cerrarSolicitud() {
    this.rutaSeleccionada.set(null);
    this.comentarioSolicitud.set('');
    this.mensajeError.set('');

    this.editorMap?.remove();
    this.editorMap = undefined;
  }

  cerrarModalAuth() {
    this.mostrarModalAuth.set(false);
  }

  actualizarComentario(valor: string) {
    this.comentarioSolicitud.set(valor);
  }

  actualizarEditor(campo: keyof EditorActualizacion, valor: string | number) {
    this.editor.update((actual) => ({
      ...actual,
      [campo]: campo === 'precio' ? Number(valor) : valor,
    }));

    if (campo === 'color') {
      this.dibujarEditorMapa();
    }
  }

  iniciarEditorMapa() {
    if (!this.editorMapaRef) return;

    this.editorMap?.remove();

    this.editorMap = L.map(this.editorMapaRef.nativeElement).setView(
      [15.5042, -88.025],
      13
    );

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.editorMap);

    this.editorRutaLayer = L.layerGroup().addTo(this.editorMap);
    this.editorParadasLayer = L.layerGroup().addTo(this.editorMap);

    this.editorMap.on('click', (event: L.LeafletMouseEvent) => {
      this.puntosGuia.update((puntos) => [
        ...puntos,
        {
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        },
      ]);

      this.recorrido.set(this.puntosGuia());
      this.dibujarEditorMapa();
    });

    setTimeout(() => {
      this.editorMap?.invalidateSize();
      this.dibujarEditorMapa();
    }, 300);
  }

  dibujarEditorMapa() {
    if (!this.editorMap) return;

    this.editorRutaLayer.clearLayers();
    this.editorParadasLayer.clearLayers();

    const puntos = this.obtenerPuntosEditor();

    if (puntos.length > 0) {
      L.polyline(puntos, {
        color: this.editor().color || '#2563eb',
        weight: 6,
        opacity: 0.95,
      }).addTo(this.editorRutaLayer);

      this.editorMap.fitBounds(L.latLngBounds(puntos), {
        padding: [30, 30],
      });
    }

    this.paradas().forEach((parada) => {
      L.circleMarker([parada.lat, parada.lng], {
        radius: 7,
        color: '#16a34a',
        fillColor: '#16a34a',
        fillOpacity: 1,
        weight: 3,
      })
        .bindPopup(parada.nombre)
        .addTo(this.editorParadasLayer);
    });
  }

  obtenerPuntosEditor(): [number, number][] {
    const puntos =
      this.recorrido().length > 0 ? this.recorrido() : this.puntosGuia();

    return puntos.map((punto) => [punto.lat, punto.lng] as [number, number]);
  }

  deshacerPunto() {
    const puntos = this.puntosGuia();

    if (puntos.length === 0) return;

    const actualizado = puntos.slice(0, -1);

    this.puntosGuia.set(actualizado);
    this.recorrido.set(actualizado);
    this.dibujarEditorMapa();
  }

  limpiarTrayecto() {
    this.puntosGuia.set([]);
    this.recorrido.set([]);
    this.dibujarEditorMapa();
  }

  restaurarTrayectoOriginal() {
    const ruta = this.rutaSeleccionada();

    if (!ruta) return;

    this.puntosGuia.set([...(ruta.puntosGuia || [])]);
    this.recorrido.set([...(ruta.recorrido || ruta.puntosGuia || [])]);
    this.paradas.set([...(ruta.paradas || [])]);
    this.dibujarEditorMapa();
  }

  quitarParada(index: number) {
    this.paradas.update((items) =>
      items
        .filter((_, i) => i !== index)
        .map((parada, i) => ({
          ...parada,
          orden: i + 1,
        }))
    );

    this.dibujarEditorMapa();
  }

  async enviarSolicitud() {
    const ruta = this.rutaSeleccionada();
    const comentario = this.comentarioSolicitud().trim();

    if (!ruta || !this.usuarioId()) {
      this.mostrarModalAuth.set(true);
      return;
    }

    if (!comentario) {
      this.mensajeError.set('Escribe una explicación para enviar la solicitud.');
      return;
    }

    if (this.tipoSolicitud() === 'actualizacion') {
      sessionStorage.setItem(
        'mirutahn_actualizacion_ruta',
        JSON.stringify({
          ruta,
          comentario,
          usuario: {
            uid: this.usuarioId(),
            nombre: this.usuarioNombre(),
          },
        })
      );

      await this.router.navigate(['/proponer-ruta'], {
        queryParams: {
          modo: 'actualizacion',
          rutaId: ruta.id,
        },
      });
      this.cerrarSolicitud();
      return;
    }

    this.guardandoSolicitud.set(true);
    this.mensajeError.set('');

    try {
      if (this.tipoSolicitud() === 'eliminacion') {
        await this.rutaService.crearPropuestaEliminacion(
          ruta,
          {
            uid: this.usuarioId()!,
            nombre: this.usuarioNombre(),
          },
          comentario,
          Timestamp.now()
        );

        this.mensajeExito.set(
          'La solicitud de eliminación fue enviada a validación comunitaria.'
        );
      } else {
        const cambios = this.editor();

        await this.rutaService.crearPropuestaActualizacion(
          ruta,
          {
            nombre: cambios.nombre.trim(),
            numero: cambios.numero.trim(),
            precio: Number(cambios.precio),
            horario: cambios.horario.trim() || 'No definido',
            frecuencia: cambios.frecuencia.trim() || 'No definida',
            color: cambios.color || '#2563eb',
            descripcion: cambios.descripcion.trim(),
            puntosGuia: this.puntosGuia(),
            recorrido:
              this.recorrido().length > 0 ? this.recorrido() : this.puntosGuia(),
            paradas: this.paradas(),
          },
          {
            uid: this.usuarioId()!,
            nombre: this.usuarioNombre(),
          },
          comentario,
          Timestamp.now()
        );

        this.mensajeExito.set(
          'La propuesta de actualización fue enviada a validación comunitaria.'
        );
      }

      this.cerrarSolicitud();
    } catch (error) {
      console.error(error);
      this.mensajeError.set('No se pudo enviar la solicitud.');
    } finally {
      this.guardandoSolicitud.set(false);
    }
  }

  paradasResumen(ruta: RutaTransporte) {
    return ruta.paradas?.length
      ? `${ruta.paradas.length} paradas`
      : 'Sin paradas registradas';
  }

  primerasParadas(ruta: RutaTransporte) {
    return (ruta.paradas || []).slice(0, 2);
  }

  actualizacionPendiente(ruta: RutaTransporte) {
    return this.actualizacionesPendientes().find(
      (propuesta) => propuesta.rutaOrigenId === ruta.id
    );
  }

  irAValidarActualizacion(propuesta?: PropuestaRuta) {
    if (!propuesta?.id) return;

    if (!this.usuarioId()) {
      this.mostrarModalAuth.set(true);
      return;
    }

    this.router.navigate(['/comunidad'], {
      queryParams: {
        propuestaId: propuesta.id,
      },
    });
  }
}
