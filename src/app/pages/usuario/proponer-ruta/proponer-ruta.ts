import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';
import { OpenRouteService } from '../../../services/open-route.service';
import {
  Coordenada,
  Parada,
  PropuestaRuta,
  RutaService,
  RutaTransporte,
} from '../../../services/ruta.service';
import { AuthRequiredModal } from '../../../components/auth-required-modal/auth-required-modal';
import {
  AppAlertModal,
  AlertModalType,
} from '../../../components/app-alert-modal/app-alert-modal';
import { AppPromptModal } from '../../../components/app-prompt-modal/app-prompt-modal';

@Component({
  selector: 'app-proponer-ruta',
  imports: [
    FormsModule,
    Sidebar,
    AuthRequiredModal,
    AppAlertModal,
    AppPromptModal,
  ],
  templateUrl: './proponer-ruta.html',
  styleUrl: './proponer-ruta.scss',
})
export class ProponerRuta implements AfterViewInit, OnDestroy {
  @ViewChild('mapaPropuesta') mapaPropuesta!: ElementRef<HTMLDivElement>;

  private rutaService = inject(RutaService);
  private authService = inject(AuthService);
  private openRouteService = inject(OpenRouteService);
  private activatedRoute = inject(ActivatedRoute);

  usuarioAuth = signal<any | null>(null);
  usuarioPerfil = signal<any | null>(null);

  modoActualizacion = signal(false);
  rutaOrigen = signal<RutaTransporte | null>(null);
  motivoActualizacion = signal('');

  guardando = signal(false);
  calculandoRuta = signal(false);
  intentoGuardarPropuesta = signal(false);
  estadoPropuesta = signal('');

  mostrarModalAuth = signal(false);
  mostrarPromptParada = signal(false);

  alertaVisible = signal(false);
  alertaTitulo = signal('');
  alertaMensaje = signal('');
  alertaTipo = signal<AlertModalType>('info');

  private map?: L.Map;
  private recorridoLayer?: L.Polyline;
  private guiaLayer?: L.Polyline;
  private markersLayer = L.layerGroup();

  private mapaActivo = false;
  private iniciarMapaTimeout?: ReturnType<typeof setTimeout>;
  private invalidateMapaTimeout?: ReturnType<typeof setTimeout>;

  coloresRuta = [
    '#2563eb',
    '#16a34a',
    '#ea580c',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
  ];

  horasHorario = Array.from({ length: 12 }, (_, index) =>
    String(index + 1).padStart(2, '0')
  );

  minutosHorario = ['00', '15', '30', '45'];
  periodosHorario = ['AM', 'PM'];

  nuevaPropuesta = signal({
    nombre: '',
    numero: '',
    precio: 0,
    horario: '',
    frecuencia: '',
    color: '#2563eb',
    descripcion: '',
    comentarios: '',
  });

  puntosGuia = signal<Coordenada[]>([]);
  recorrido = signal<Coordenada[]>([]);
  paradas = signal<Parada[]>([]);

  async ngAfterViewInit() {
    await this.cargarUsuario();
    this.cargarBorradorActualizacion();

    this.iniciarMapaTimeout = setTimeout(() => {
      this.iniciarMapa();
      this.actualizarMapa();
    }, 350);
  }

  ngOnDestroy() {
    this.mapaActivo = false;

    if (this.iniciarMapaTimeout) {
      clearTimeout(this.iniciarMapaTimeout);
    }

    if (this.invalidateMapaTimeout) {
      clearTimeout(this.invalidateMapaTimeout);
    }

    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = undefined;
    }
  }

  async cargarUsuario() {
    const usuario = await this.authService.obtenerUsuarioActual();
    this.usuarioAuth.set(usuario);

    if (usuario) {
      const perfil = await this.authService.obtenerPerfilUsuario(usuario.uid);
      this.usuarioPerfil.set(perfil);
    }
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

  requiereSesion(): boolean {
    if (!this.usuarioAuth()) {
      this.mostrarModalAuth.set(true);
      return false;
    }

    return true;
  }

  async puedeParticipar() {
    if (!this.requiereSesion()) return false;

    const perfil =
      this.usuarioPerfil() ||
      (this.usuarioAuth()
        ? await this.authService.obtenerPerfilUsuario(this.usuarioAuth()!.uid)
        : null);

    if (this.authService.estaUsuarioSuspendido(perfil)) {
      this.mostrarAlerta(
        'Participacion suspendida',
        this.authService.mensajeSuspension(perfil),
        'warning'
      );
      return false;
    }

    return true;
  }

  cerrarModalAuth() {
    this.mostrarModalAuth.set(false);
  }

  cargarBorradorActualizacion() {
    if (
      this.activatedRoute.snapshot.queryParamMap.get('modo') !==
      'actualizacion'
    ) {
      return;
    }

    const borrador = sessionStorage.getItem('mirutahn_actualizacion_ruta');

    if (!borrador) {
      this.mostrarAlerta(
        'No se encontró la ruta',
        'Vuelve a rutas públicas y selecciona una ruta para actualizar.',
        'warning'
      );
      return;
    }

    try {
      const data = JSON.parse(borrador) as {
        ruta?: RutaTransporte;
        comentario?: string;
      };

      if (!data.ruta?.id) {
        throw new Error('Borrador incompleto.');
      }

      const ruta = data.ruta;
      const comentario = data.comentario || '';

      this.modoActualizacion.set(true);
      this.rutaOrigen.set(ruta);
      this.motivoActualizacion.set(comentario);

      this.nuevaPropuesta.set({
        nombre: ruta.nombre || '',
        numero: ruta.numero || '',
        precio: Number(ruta.precio || 0),
        horario: ruta.horario || '',
        frecuencia: ruta.frecuencia || '',
        color: ruta.color || '#2563eb',
        descripcion: ruta.descripcion || '',
        comentarios: comentario,
      });

      this.puntosGuia.set([...(ruta.puntosGuia || [])]);
      this.recorrido.set([...(ruta.recorrido || ruta.puntosGuia || [])]);
      this.paradas.set([...(ruta.paradas || [])]);
    } catch (error) {
      console.error(error);

      this.mostrarAlerta(
        'No se pudo cargar',
        'La información temporal de la actualización no es válida.',
        'error'
      );
    }
  }

  iniciarMapa() {
    if (!this.mapaPropuesta?.nativeElement) return;

    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = undefined;
    }

    this.mapaActivo = true;

    this.map = L.map(this.mapaPropuesta.nativeElement, {
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView([15.5042, -88.025], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    this.guiaLayer = L.polyline([], {
      color: '#94a3b8',
      weight: 3,
      opacity: 0.75,
      dashArray: '8, 8',
    }).addTo(this.map);

    this.recorridoLayer = L.polyline([], {
      color: this.nuevaPropuesta().color,
      weight: 5,
      opacity: 0.9,
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.agregarPuntoGuia(e.latlng.lat, e.latlng.lng);
    });

    requestAnimationFrame(() => this.invalidarMapaSeguro());

    this.invalidateMapaTimeout = setTimeout(() => {
      this.invalidarMapaSeguro();
    }, 800);
  }

  invalidarMapaSeguro() {
    if (!this.mapaActivo || !this.map) return;

    const contenedor = this.map.getContainer();

    if (!contenedor || !contenedor.isConnected) return;

    try {
      this.map.invalidateSize({ animate: false });
    } catch (error) {
      console.warn('El mapa de propuesta ya no está disponible.', error);
    }
  }

  actualizarCampo(campo: string, valor: string | number) {
    this.nuevaPropuesta.update((propuesta) => ({
      ...propuesta,
      [campo]: campo === 'precio' ? Number(valor) : valor,
    }));

    if (campo === 'color' && this.recorridoLayer) {
      this.recorridoLayer.setStyle({ color: String(valor) });
    }
  }

  obtenerHorarioParte(parte: string) {
    return this.obtenerHorarioActual()[parte];
  }

  actualizarHorarioParte(parte: string, valor: string) {
    const horario = {
      ...this.obtenerHorarioActual(),
      [parte]: valor,
    };

    this.actualizarCampo(
      'horario',
      `${horario['inicioHora']}:${horario['inicioMinuto']} ${horario['inicioPeriodo']} - ${horario['finHora']}:${horario['finMinuto']} ${horario['finPeriodo']}`
    );
  }

  private obtenerHorarioActual(): Record<string, string> {
    const horario = this.nuevaPropuesta().horario;
    const partes = horario.match(
      /^(\d{2}):(\d{2}) (AM|PM) - (\d{2}):(\d{2}) (AM|PM)$/
    );

    if (!partes) {
      return {
        inicioHora: '06',
        inicioMinuto: '00',
        inicioPeriodo: 'AM',
        finHora: '06',
        finMinuto: '00',
        finPeriodo: 'AM',
      };
    }

    return {
      inicioHora: partes[1],
      inicioMinuto: partes[2],
      inicioPeriodo: partes[3],
      finHora: partes[4],
      finMinuto: partes[5],
      finPeriodo: partes[6],
    };
  }

  seleccionarColor(color: string) {
    this.actualizarCampo('color', color);
  }

  agregarPuntoGuia(lat: number, lng: number) {
    this.puntosGuia.update((actual) => [...actual, { lat, lng }]);
    this.recorrido.set([]);
    this.actualizarMapa();
  }

  calcularRutaPorCalles() {
    const puntos = this.puntosGuia();

    if (puntos.length < 2) {
      this.mostrarAlerta(
        'Puntos insuficientes',
        'Agrega al menos 2 puntos guía para calcular el recorrido.',
        'warning'
      );
      return;
    }

    this.calculandoRuta.set(true);

    const coordenadas = puntos.map((p) => [p.lng, p.lat]);

    this.openRouteService.obtenerRuta(coordenadas).subscribe({
      next: (respuesta) => {
        const coords = respuesta.features[0].geometry.coordinates;

        const recorridoCalculado: Coordenada[] = coords.map(
          (coord: number[]) => ({
            lng: coord[0],
            lat: coord[1],
          })
        );

        this.recorrido.set(recorridoCalculado);
        this.actualizarMapa();
        this.calculandoRuta.set(false);
      },
      error: (err) => {
        console.error(err);
        this.calculandoRuta.set(false);

        this.mostrarAlerta(
          'No se pudo calcular',
          'No fue posible calcular la ruta por calles. Intenta con otros puntos guía.',
          'error'
        );
      },
    });
  }

  marcarUltimoComoParada() {
    const puntos = this.puntosGuia();

    if (puntos.length === 0) {
      this.mostrarAlerta(
        'Sin puntos en el mapa',
        'Primero agrega un punto en el mapa para poder marcarlo como parada.',
        'warning'
      );
      return;
    }

    this.mostrarPromptParada.set(true);
  }

  cancelarPromptParada() {
    this.mostrarPromptParada.set(false);
  }

  confirmarParada(nombre: string) {
    const puntos = this.puntosGuia();

    if (puntos.length === 0) {
      this.mostrarPromptParada.set(false);
      return;
    }

    const ultimo = puntos[puntos.length - 1];

    this.paradas.update((actual) => [
      ...actual,
      {
        nombre,
        lat: ultimo.lat,
        lng: ultimo.lng,
        orden: actual.length + 1,
      },
    ]);

    this.mostrarPromptParada.set(false);
    this.actualizarMapa();
  }

  eliminarParada(index: number) {
    this.paradas.update((actual) =>
      actual
        .filter((_, itemIndex) => itemIndex !== index)
        .map((parada, itemIndex) => ({
          ...parada,
          orden: itemIndex + 1,
        }))
    );

    this.actualizarMapa();
  }

  deshacerPunto() {
    const puntos = this.puntosGuia();

    if (puntos.length === 0) return;

    const eliminado = puntos[puntos.length - 1];

    this.puntosGuia.set(puntos.slice(0, -1));
    this.recorrido.set([]);

    this.paradas.update((actual) =>
      actual
        .filter((p) => !(p.lat === eliminado.lat && p.lng === eliminado.lng))
        .map((p, index) => ({ ...p, orden: index + 1 }))
    );

    this.actualizarMapa();
  }

  limpiarMapa() {
    this.puntosGuia.set([]);
    this.recorrido.set([]);
    this.paradas.set([]);
    this.actualizarMapa();
  }

  actualizarMapa() {
    if (
      !this.mapaActivo ||
      !this.map ||
      !this.guiaLayer ||
      !this.recorridoLayer ||
      !this.markersLayer
    ) {
      return;
    }

    const contenedor = this.map.getContainer();

    if (!contenedor || !contenedor.isConnected) return;

    const guia = this.puntosGuia().map(
      (p) => [p.lat, p.lng] as [number, number]
    );

    const recorrido = this.recorrido().map(
      (p) => [p.lat, p.lng] as [number, number]
    );

    this.guiaLayer.setLatLngs(guia);
    this.recorridoLayer.setLatLngs(recorrido);
    this.markersLayer.clearLayers();

    this.puntosGuia().forEach((punto, index) => {
      const parada = this.paradas().find(
        (p) => p.lat === punto.lat && p.lng === punto.lng
      );

      L.circleMarker([punto.lat, punto.lng], {
        radius: parada ? 9 : 6,
        color: parada ? '#16a34a' : '#2563eb',
        fillColor: parada ? '#16a34a' : '#2563eb',
        fillOpacity: 1,
        weight: 3,
      })
        .bindPopup(parada ? parada.nombre : `Punto guía ${index + 1}`)
        .addTo(this.markersLayer);
    });

    const boundsSource = recorrido.length > 0 ? recorrido : guia;

    if (boundsSource.length > 0) {
      try {
        this.map.invalidateSize({ animate: false });
        this.map.fitBounds(L.latLngBounds(boundsSource), {
          padding: [30, 30],
          animate: false,
        });
      } catch (error) {
        console.warn('No se pudo ajustar el mapa de propuesta.', error);
      }
    }
  }

  async guardarPropuesta() {
    this.intentoGuardarPropuesta.set(true);
    this.estadoPropuesta.set('');

    if (!(await this.puedeParticipar())) return;

    const propuesta = this.nuevaPropuesta();
    const usuario = this.usuarioAuth();

    if (!usuario) {
      this.mostrarModalAuth.set(true);
      return;
    }

    if (!propuesta.nombre.trim() || !propuesta.numero.trim()) {
      this.mostrarAlerta(
        'Información incompleta',
        'Completa el nombre y número de la ruta antes de enviarla.',
        'warning'
      );
      return;
    }

    if (!propuesta.horario.trim()) {
      this.mostrarAlerta(
        'Horario incompleto',
        'Selecciona el horario aproximado de la ruta.',
        'warning'
      );
      return;
    }

    if (this.puntosGuia().length < 2) {
      this.mostrarAlerta(
        'Recorrido incompleto',
        'Dibuja al menos 2 puntos guía en el mapa.',
        'warning'
      );
      return;
    }

    this.guardando.set(true);

    const data: Omit<PropuestaRuta, 'id'> = {
      tipoPropuesta: this.modoActualizacion() ? 'actualizacion' : 'nueva',
      ...(this.rutaOrigen()?.id ? { rutaOrigenId: this.rutaOrigen()!.id } : {}),
      motivoCambio: propuesta.comentarios || this.motivoActualizacion(),

      nombre: propuesta.nombre.trim(),
      numero: propuesta.numero.trim(),
      precio: Number(propuesta.precio),
      horario: propuesta.horario || 'No definido',
      frecuencia: propuesta.frecuencia || 'No definida',
      color: propuesta.color,
      descripcion: propuesta.descripcion.trim(),
      comentarios: propuesta.comentarios.trim(),
      puntosGuia: this.puntosGuia(),
      recorrido:
        this.recorrido().length > 0 ? this.recorrido() : this.puntosGuia(),
      paradas: this.paradas(),
      estado: 'pendiente',
      creadoPor: usuario.uid,
      creadoPorNombre:
        this.usuarioPerfil()?.nombre || usuario.email || 'Ciudadano',
      creadoEn: Timestamp.now(),
      aprobaciones: 0,
      rechazos: 0,
    };

    try {
      if (this.modoActualizacion() && this.rutaOrigen()) {
        await this.rutaService.crearPropuestaActualizacion(
          this.rutaOrigen()!,
          {
            nombre: data.nombre,
            numero: data.numero,
            precio: data.precio,
            horario: data.horario || 'No definido',
            frecuencia: data.frecuencia || 'No definida',
            color: data.color,
            descripcion: data.descripcion || '',
            puntosGuia: data.puntosGuia || [],
            recorrido: data.recorrido,
            paradas: data.paradas,
          },
          {
            uid: usuario.uid,
            nombre: this.usuarioPerfil()?.nombre || usuario.email || 'Ciudadano',
          },
          propuesta.comentarios || this.motivoActualizacion(),
          Timestamp.now()
        );
      } else {
        await this.rutaService.createPropuestaRuta(data);
      }

      this.mostrarAlerta(
        'Propuesta enviada',
        this.modoActualizacion()
          ? 'La actualización fue enviada correctamente. Ahora la comunidad podrá revisarla.'
          : 'Tu propuesta fue enviada correctamente. Ahora la comunidad podrá revisarla.',
        'success'
      );

      this.estadoPropuesta.set(
        this.modoActualizacion()
          ? 'Actualización de ruta enviada correctamente.'
          : 'Propuesta de ruta enviada correctamente.'
      );
      sessionStorage.removeItem('mirutahn_actualizacion_ruta');
      this.resetFormulario();
    } catch (err) {
      console.error(err);

      this.mostrarAlerta(
        'Error al guardar',
        'No se pudo guardar la propuesta. Inténtalo nuevamente.',
        'error'
      );
      this.estadoPropuesta.set('No se pudo guardar la propuesta.');
    } finally {
      this.guardando.set(false);
    }
  }

  resetFormulario() {
    this.nuevaPropuesta.set({
      nombre: '',
      numero: '',
      precio: 0,
      horario: '',
      frecuencia: '',
      color: '#2563eb',
      descripcion: '',
      comentarios: '',
    });

    this.modoActualizacion.set(false);
    this.rutaOrigen.set(null);
    this.motivoActualizacion.set('');
    this.intentoGuardarPropuesta.set(false);
    sessionStorage.removeItem('mirutahn_actualizacion_ruta');
    this.limpiarMapa();
  }

  nombreRutaInvalido() {
    return (
      this.intentoGuardarPropuesta() && !this.nuevaPropuesta().nombre.trim()
    );
  }

  numeroRutaInvalido() {
    return (
      this.intentoGuardarPropuesta() && !this.nuevaPropuesta().numero.trim()
    );
  }

  horarioRutaInvalido() {
    return (
      this.intentoGuardarPropuesta() && !this.nuevaPropuesta().horario.trim()
    );
  }

  recorridoRutaInvalido() {
    return this.intentoGuardarPropuesta() && this.puntosGuia().length < 2;
  }
}
