import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { Timestamp } from '@angular/fire/firestore';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';
import {
  APPROVAL_THRESHOLD,
  PropuestaRuta,
  RutaService,
  TipoValidacionRuta,
  ValidacionRuta,
} from '../../../services/ruta.service';
import { AuthRequiredModal } from '../../../components/auth-required-modal/auth-required-modal';
import {
  AppAlertModal,
  AlertModalType,
} from '../../../components/app-alert-modal/app-alert-modal';

@Component({
  selector: 'app-comunidad',
  imports: [FormsModule, Sidebar, AuthRequiredModal, AppAlertModal],
  templateUrl: './comunidad.html',
  styleUrl: './comunidad.scss',
})
export class Comunidad implements AfterViewInit, OnDestroy {
  @ViewChildren('miniMapa') miniMapaRefs!: QueryList<ElementRef<HTMLDivElement>>;

  private rutaService = inject(RutaService);
  private authService = inject(AuthService);
  private activatedRoute = inject(ActivatedRoute);

  approvalThreshold = APPROVAL_THRESHOLD;

  propuestas = signal<PropuestaRuta[]>([]);
  validaciones = signal<ValidacionRuta[]>([]);
  propuestaSeleccionada = signal<PropuestaRuta | null>(null);

  usuarioAuth = signal<any | null>(null);
  usuarioPerfil = signal<any | null>(null);
  esAdmin = signal(false);

  cargando = signal(false);
  enviando = signal(false);

  mostrarModalAuth = signal(false);

  alertaVisible = signal(false);
  alertaTitulo = signal('');
  alertaMensaje = signal('');
  alertaTipo = signal<AlertModalType>('info');

  nuevaValidacion = signal({
    comentario: '',
  });

  private miniMaps = new Map<string, L.Map>();
  private miniMapObservers = new Map<string, ResizeObserver>();

  async ngAfterViewInit() {
    await this.cargarUsuario();
    this.cargarPropuestas();

    this.miniMapaRefs.changes.subscribe(() => {
      requestAnimationFrame(() => this.inicializarMiniMapas());
    });
  }

  ngOnDestroy() {
    this.miniMaps.forEach((mapa) => {
      mapa.off();
      mapa.remove();
    });
    this.miniMaps.clear();
    this.miniMapObservers.forEach((observer) => observer.disconnect());
    this.miniMapObservers.clear();
  }

  async cargarUsuario() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.usuarioAuth.set(usuario);

    if (usuario) {
      const perfil = await this.authService.obtenerPerfilUsuario(usuario.uid);
      this.usuarioPerfil.set(perfil);
    }

    const admin = await this.authService.isAdmin();
    this.esAdmin.set(admin);
  }

  cargarPropuestas() {
    this.cargando.set(true);

    this.rutaService.getPropuestasRuta().subscribe({
      next: (data) => {
        this.propuestas.set(data);
        this.cargando.set(false);
        this.seleccionarPropuestaDesdeUrl(data);

        requestAnimationFrame(() => this.inicializarMiniMapas());
      },
      error: (err) => {
        console.error(err);
        this.cargando.set(false);

        this.mostrarAlerta(
          'Error al cargar',
          'No se pudieron cargar las propuestas comunitarias.',
          'error'
        );
      },
    });
  }

  inicializarMiniMapas() {
    const idsActuales = new Set(
      this.propuestas()
        .map((propuesta) => propuesta.id)
        .filter((id): id is string => Boolean(id))
    );

    this.miniMaps.forEach((mapa, id) => {
      if (!idsActuales.has(id)) {
        mapa.remove();
        this.miniMaps.delete(id);
        this.miniMapObservers.get(id)?.disconnect();
        this.miniMapObservers.delete(id);
      }
    });

    this.propuestas().forEach((propuesta) => {
      if (!propuesta.id) return;

      const contenedor = this.obtenerContenedorMiniMapa(propuesta.id);

      if (!contenedor) return;

      const recorrido = this.obtenerRecorridoPropuesta(propuesta).map(
        (punto) => [punto.lat, punto.lng] as [number, number]
      );
      const bounds =
        recorrido.length > 0 ? L.latLngBounds(recorrido) : undefined;
      const mapaExistente = this.miniMaps.get(propuesta.id);

      if (mapaExistente) {
        if (mapaExistente.getContainer() !== contenedor) {
          mapaExistente.remove();
          this.miniMaps.delete(propuesta.id);
          this.miniMapObservers.get(propuesta.id)?.disconnect();
          this.miniMapObservers.delete(propuesta.id);
        } else {
          this.actualizarTamanoMiniMapa(
            propuesta.id,
            mapaExistente,
            contenedor,
            bounds
          );
          return;
        }
      }

      if (contenedor.clientWidth === 0 || contenedor.clientHeight === 0) {
        this.observarMiniMapa(propuesta.id, contenedor, bounds);
        return;
      }

      const mapa = L.map(contenedor, {
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
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

      if (recorrido.length > 0) {
        L.polyline(recorrido, {
          color: propuesta.color || '#2563eb',
          weight: 5,
          opacity: 0.9,
        }).addTo(mapa);
      }

      propuesta.paradas?.forEach((parada) => {
        L.circleMarker([parada.lat, parada.lng], {
          radius: 5,
          color: '#16a34a',
          fillColor: '#16a34a',
          fillOpacity: 1,
          weight: 2,
        }).addTo(mapa);
      });

      this.miniMaps.set(propuesta.id, mapa);
      this.actualizarTamanoMiniMapa(
        propuesta.id,
        mapa,
        contenedor,
        recorrido.length > 0 ? L.latLngBounds(recorrido) : undefined
      );
    });
  }

  private observarMiniMapa(
    propuestaId: string,
    contenedor: HTMLDivElement,
    bounds?: L.LatLngBounds
  ) {
    if (this.miniMapObservers.has(propuestaId)) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === 0 || entry.contentRect.height === 0) {
        return;
      }

      observer.disconnect();
      this.miniMapObservers.delete(propuestaId);
      this.inicializarMiniMapas();

      const mapa = this.miniMaps.get(propuestaId);

      if (mapa) {
        this.actualizarTamanoMiniMapa(propuestaId, mapa, contenedor, bounds);
      }
    });

    observer.observe(contenedor);
    this.miniMapObservers.set(propuestaId, observer);
  }

  private actualizarTamanoMiniMapa(
    propuestaId: string,
    mapa: L.Map,
    contenedor: HTMLDivElement,
    bounds?: L.LatLngBounds
  ) {
    requestAnimationFrame(() => {
      if (!contenedor.isConnected || this.miniMaps.get(propuestaId) !== mapa) {
        return;
      }

      try {
        mapa.invalidateSize();

        if (bounds) {
          mapa.fitBounds(bounds, {
            padding: [20, 20],
            animate: false,
          });
        }
      } catch (err) {
        console.warn('No se pudo redimensionar el mini mapa.', err);
      }
    });
  }

  private obtenerContenedorMiniMapa(id: string) {
    return this.miniMapaRefs
      .toArray()
      .map((ref) => ref.nativeElement)
      .find((contenedor) => contenedor.dataset['propuestaId'] === id);
  }

  private obtenerRecorridoPropuesta(propuesta: PropuestaRuta) {
    if (propuesta.recorrido?.length > 0) {
      return propuesta.recorrido;
    }

    return propuesta.puntosGuia || [];
  }

  seleccionarPropuesta(propuesta: PropuestaRuta) {
    this.propuestaSeleccionada.set(propuesta);
    this.nuevaValidacion.set({ comentario: '' });

    if (!propuesta.id) return;

    this.rutaService.getValidacionesPorPropuesta(propuesta.id).subscribe({
      next: (data) => this.validaciones.set(data),
      error: (err) => console.error(err),
    });
  }

  cerrarValidacionMovil() {
    this.propuestaSeleccionada.set(null);
    this.validaciones.set([]);
    this.nuevaValidacion.set({ comentario: '' });
  }

  private seleccionarPropuestaDesdeUrl(propuestas: PropuestaRuta[]) {
    const propuestaId =
      this.activatedRoute.snapshot.queryParamMap.get('propuestaId');

    if (!propuestaId || this.propuestaSeleccionada()?.id === propuestaId) {
      return;
    }

    const propuesta = propuestas.find((item) => item.id === propuestaId);

    if (propuesta) {
      this.seleccionarPropuesta(propuesta);
    }
  }

  tipoPropuestaTexto(propuesta?: PropuestaRuta | null) {
    if (propuesta?.tipoPropuesta === 'actualizacion') {
      return 'Solicitud de actualización';
    }

    if (propuesta?.tipoPropuesta === 'eliminacion') {
      return 'Reporte de ruta falsa';
    }

    return 'Nueva ruta';
  }

  actualizarComentario(comentario: string) {
    this.nuevaValidacion.update((actual) => ({
      ...actual,
      comentario,
    }));
  }

  requiereSesion() {
    if (!this.usuarioAuth()) {
      this.mostrarModalAuth.set(true);
      return false;
    }

    return true;
  }

  cerrarModalAuth() {
    this.mostrarModalAuth.set(false);
  }

  async enviarValidacion(tipo: TipoValidacionRuta) {
    if (!this.requiereSesion()) return;

    const propuesta = this.propuestaSeleccionada();
    const usuario = this.usuarioAuth();
    const comentario = this.nuevaValidacion().comentario.trim();

    if (!propuesta?.id) {
      this.mostrarAlerta(
        'Selecciona una propuesta',
        'Primero selecciona una propuesta para poder validarla.',
        'warning'
      );
      return;
    }

    if (propuesta.estado !== 'pendiente') {
      this.mostrarAlerta(
        'Propuesta cerrada',
        'Esta propuesta ya fue aprobada o rechazada.',
        'warning'
      );
      return;
    }

    if (tipo === 'comentario' && !comentario) {
      this.mostrarAlerta(
        'Comentario vacío',
        'Escribe un comentario antes de enviarlo.',
        'warning'
      );
      return;
    }

    this.enviando.set(true);

    try {
      await this.rutaService.createValidacionRuta({
        propuestaId: propuesta.id,
        usuarioId: usuario.uid,
        usuarioNombre:
          this.usuarioPerfil()?.nombre || usuario.email || 'Ciudadano',
        tipo,
        comentario,
        creadoEn: Timestamp.now(),
      });

      this.nuevaValidacion.set({ comentario: '' });

      this.mostrarAlerta(
        'Validación enviada',
        tipo === 'comentario'
          ? 'Tu comentario fue publicado correctamente.'
          : 'Tu voto fue registrado correctamente.',
        'success'
      );
    } catch (err: any) {
      this.mostrarAlerta(
        'No se pudo validar',
        err?.message || 'No se pudo registrar tu validación.',
        'error'
      );
    } finally {
      this.enviando.set(false);
    }
  }

  async aprobarManual(propuesta: PropuestaRuta) {
    if (!this.esAdmin()) return;

    try {
      await this.rutaService.aprobarPropuestaComoRuta(propuesta);

      this.mostrarAlerta(
        'Ruta publicada',
        'La propuesta fue publicada como ruta oficial.',
        'success'
      );
    } catch {
      this.mostrarAlerta(
        'Error',
        'No se pudo publicar la propuesta.',
        'error'
      );
    }
  }

  async rechazarManual(propuesta: PropuestaRuta) {
    if (!this.esAdmin() || !propuesta.id) return;

    try {
      await this.rutaService.rechazarPropuestaRuta(propuesta.id);

      this.mostrarAlerta(
        'Propuesta rechazada',
        'La propuesta fue marcada como rechazada.',
        'success'
      );
    } catch {
      this.mostrarAlerta(
        'Error',
        'No se pudo rechazar la propuesta.',
        'error'
      );
    }
  }

  async eliminarPropuesta(propuesta: PropuestaRuta) {
    if (!this.esAdmin() || !propuesta.id) return;

    try {
      await this.rutaService.deletePropuestaRuta(propuesta.id);

      this.mostrarAlerta(
        'Propuesta eliminada',
        'La propuesta fue eliminada correctamente.',
        'success'
      );
    } catch {
      this.mostrarAlerta(
        'Error',
        'No se pudo eliminar la propuesta.',
        'error'
      );
    }
  }

  votosDelUsuario(propuesta?: PropuestaRuta | null) {
    if (!propuesta?.id || !this.usuarioAuth()) return false;

    return this.validaciones().some(
      (validacion) =>
        validacion.propuestaId === propuesta.id &&
        validacion.usuarioId === this.usuarioAuth()?.uid &&
        (validacion.tipo === 'aprobacion' || validacion.tipo === 'rechazo')
    );
  }

  porcentajeAprobacion(propuesta: PropuestaRuta) {
    const valor = Math.min(
      100,
      Math.round((propuesta.aprobaciones / this.approvalThreshold) * 100)
    );

    return `${valor}%`;
  }

  formatearFecha(timestamp?: Timestamp) {
    if (!timestamp) return '';

    return timestamp.toDate().toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  mostrarAlerta(
    titulo: string,
    mensaje: string,
    tipo: AlertModalType = 'info'
  ) {
    this.alertaTitulo.set(titulo);
    this.alertaMensaje.set(mensaje);
    this.alertaTipo.set(tipo);
    this.alertaVisible.set(true);
  }

  cerrarAlerta() {
    this.alertaVisible.set(false);
  }
}
