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
import * as L from 'leaflet';
import { Timestamp } from '@angular/fire/firestore';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { AuthService } from '../../../services/auth';
import { OpenRouteService } from '../../../services/open-route.service';
import {
  Coordenada,
  NotaComunitaria,
  Parada,
  PropuestaRuta,
  RutaService,
  RutaTransporte,
  TipoValidacionRuta,
  ValidacionRuta,
} from '../../../services/ruta.service';

@Component({
  selector: 'app-colaborar',
  imports: [FormsModule, Sidebar],
  templateUrl: './colaborar.html',
  styleUrl: './colaborar.scss',
})
export class Colaborar implements AfterViewInit, OnDestroy {
  @ViewChild('mapaPropuesta') mapaPropuesta!: ElementRef<HTMLDivElement>;

  private rutaService = inject(RutaService);
  private authService = inject(AuthService);
  private openRouteService = inject(OpenRouteService);

  propuestas = signal<PropuestaRuta[]>([]);
  rutas = signal<RutaTransporte[]>([]);
  notas = signal<NotaComunitaria[]>([]);
  validaciones = signal<ValidacionRuta[]>([]);
  propuestaSeleccionada = signal<PropuestaRuta | null>(null);
  cargando = signal(false);
  calculandoRuta = signal(false);
  guardando = signal(false);
  esAdmin = signal(false);

  usuarioAuth: Awaited<ReturnType<AuthService['obtenerUsuarioActual']>> = null;
  usuarioPerfil: any = null;

  private map!: L.Map;
  private recorridoLayer!: L.Polyline;
  private guiaLayer!: L.Polyline;
  private markersLayer = L.layerGroup();

  coloresRuta = ['#2563eb', '#16a34a', '#ea580c', '#dc2626', '#7c3aed', '#0891b2'];

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

  nuevaValidacion = signal({
    tipo: 'comentario' as TipoValidacionRuta,
    comentario: '',
  });

  nuevaNota = signal({
    rutaId: '',
    campoMarcado: 'otro' as NonNullable<NotaComunitaria['campoMarcado']>,
    comentario: '',
  });

  puntosGuia = signal<Coordenada[]>([]);
  recorrido = signal<Coordenada[]>([]);
  paradas = signal<Parada[]>([]);

  async ngAfterViewInit() {
    await this.cargarUsuario();

    setTimeout(() => {
      this.iniciarMapa();
      this.cargarDatos();
    }, 350);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  async cargarUsuario() {
    this.usuarioAuth = await this.authService.obtenerUsuarioActual();

    if (this.usuarioAuth) {
      this.usuarioPerfil = await this.authService.obtenerPerfilUsuario(this.usuarioAuth.uid);
    }

    this.esAdmin.set(await this.authService.isAdmin());
  }

  cargarDatos() {
    this.cargando.set(true);

    this.rutaService.getPropuestasRuta().subscribe({
      next: (data) => {
        this.propuestas.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.cargando.set(false);
      },
    });

    this.rutaService.getRutas().subscribe((data) => this.rutas.set(data));
    this.rutaService.getNotasActivas().subscribe((data) => this.notas.set(data));
  }

  iniciarMapa() {
    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(this.mapaPropuesta.nativeElement).setView([15.5042, -88.025], 13);

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

    requestAnimationFrame(() => this.map.invalidateSize());
    setTimeout(() => this.map.invalidateSize(), 800);
  }

  actualizarCampo(campo: string, valor: string | number) {
    this.nuevaPropuesta.update((ruta) => ({
      ...ruta,
      [campo]: campo === 'precio' ? Number(valor) : valor,
    }));

    if (campo === 'color' && this.recorridoLayer) {
      this.recorridoLayer.setStyle({ color: String(valor) });
    }
  }

  seleccionarColor(color: string) {
    this.actualizarCampo('color', color);
  }

  actualizarComentarioValidacion(comentario: string) {
    this.nuevaValidacion.update((validacion) => ({
      ...validacion,
      comentario,
    }));
  }

  actualizarNotaCampo(campo: 'rutaId' | 'campoMarcado' | 'comentario', valor: string) {
    this.nuevaNota.update((nota) => ({
      ...nota,
      [campo]: valor,
    }));
  }

  agregarPuntoGuia(lat: number, lng: number) {
    this.puntosGuia.update((actual) => [...actual, { lat, lng }]);
    this.recorrido.set([]);
    this.actualizarMapa();
  }

  calcularRutaPorCalles() {
    const puntos = this.puntosGuia();

    if (puntos.length < 2) {
      alert('Agrega al menos 2 puntos guia.');
      return;
    }

    this.calculandoRuta.set(true);

    this.openRouteService.obtenerRuta(puntos.map((p) => [p.lng, p.lat])).subscribe({
      next: (respuesta) => {
        const coords = respuesta.features[0].geometry.coordinates;

        this.recorrido.set(
          coords.map((coord: number[]) => ({
            lng: coord[0],
            lat: coord[1],
          }))
        );

        this.actualizarMapa();
        this.calculandoRuta.set(false);
      },
      error: (err) => {
        console.error(err);
        this.calculandoRuta.set(false);
        alert('No se pudo calcular la ruta.');
      },
    });
  }

  marcarUltimoComoParada() {
    const puntos = this.puntosGuia();

    if (puntos.length === 0) {
      alert('Primero agrega un punto en el mapa.');
      return;
    }

    const nombre = prompt('Nombre de la parada:', `Parada ${this.paradas().length + 1}`);

    if (!nombre) return;

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
    const guia = this.puntosGuia().map((p) => [p.lat, p.lng] as [number, number]);
    const recorrido = this.recorrido().map((p) => [p.lat, p.lng] as [number, number]);

    this.guiaLayer.setLatLngs(guia);
    this.recorridoLayer.setLatLngs(recorrido);
    this.markersLayer.clearLayers();

    this.puntosGuia().forEach((punto, index) => {
      const parada = this.paradas().find((p) => p.lat === punto.lat && p.lng === punto.lng);

      L.circleMarker([punto.lat, punto.lng], {
        radius: parada ? 9 : 6,
        color: parada ? '#16a34a' : '#2563eb',
        fillColor: parada ? '#16a34a' : '#2563eb',
        fillOpacity: 1,
        weight: 3,
      })
        .bindPopup(parada ? parada.nombre : `Punto guia ${index + 1}`)
        .addTo(this.markersLayer);
    });

    const boundsSource = recorrido.length > 0 ? recorrido : guia;

    if (boundsSource.length > 0) {
      this.map.fitBounds(L.latLngBounds(boundsSource), { padding: [30, 30] });
    }
  }

  async guardarPropuesta() {
    const propuesta = this.nuevaPropuesta();

    if (!this.usuarioAuth) {
      alert('Debes iniciar sesion para proponer rutas.');
      return;
    }

    if (!propuesta.nombre.trim() || !propuesta.numero.trim()) {
      alert('Completa el nombre y numero de la ruta.');
      return;
    }

    if (this.puntosGuia().length < 2) {
      alert('Dibuja al menos 2 puntos guia en el mapa.');
      return;
    }

    this.guardando.set(true);

    const data: Omit<PropuestaRuta, 'id'> = {
      nombre: propuesta.nombre,
      numero: propuesta.numero,
      precio: Number(propuesta.precio),
      horario: propuesta.horario,
      frecuencia: propuesta.frecuencia,
      color: propuesta.color,
      descripcion: propuesta.descripcion,
      comentarios: propuesta.comentarios,
      puntosGuia: this.puntosGuia(),
      recorrido: this.recorrido().length > 0 ? this.recorrido() : this.puntosGuia(),
      paradas: this.paradas(),
      estado: 'pendiente',
      creadoPor: this.usuarioAuth.uid,
      creadoPorNombre: this.usuarioPerfil?.nombre || this.usuarioAuth.email || 'Ciudadano',
      creadoEn: Timestamp.now(),
      aprobaciones: 0,
      rechazos: 0,
    };

    try {
      await this.rutaService.createPropuestaRuta(data);
      this.resetFormulario();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la propuesta.');
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
    this.limpiarMapa();
  }

  seleccionarPropuesta(propuesta: PropuestaRuta) {
    this.propuestaSeleccionada.set(propuesta);
    this.nuevaValidacion.set({ tipo: 'comentario', comentario: '' });

    if (!propuesta.id) return;

    this.rutaService
      .getValidacionesPorPropuesta(propuesta.id)
      .subscribe((data) => this.validaciones.set(data));
  }

  async enviarValidacion(tipo?: TipoValidacionRuta) {
    const propuesta = this.propuestaSeleccionada();
    const validacion = this.nuevaValidacion();

    if (!this.usuarioAuth || !propuesta?.id) {
      alert('Selecciona una propuesta e inicia sesion.');
      return;
    }

    const tipoFinal = tipo || validacion.tipo;

    if (tipoFinal === 'comentario' && !validacion.comentario.trim()) {
      alert('Escribe un comentario para aportar una correccion.');
      return;
    }

    await this.rutaService.createValidacionRuta({
      propuestaId: propuesta.id,
      usuarioId: this.usuarioAuth.uid,
      usuarioNombre: this.usuarioPerfil?.nombre || this.usuarioAuth.email || 'Ciudadano',
      tipo: tipoFinal,
      comentario: validacion.comentario,
      creadoEn: Timestamp.now(),
    });

    this.nuevaValidacion.set({ tipo: 'comentario', comentario: '' });
  }

  async aprobarComoRuta(propuesta: PropuestaRuta) {
    if (!this.esAdmin()) {
      alert('Solo un administrador puede publicar una propuesta como ruta oficial.');
      return;
    }

    await this.rutaService.aprobarPropuestaComoRuta(propuesta);
  }

  async rechazarPropuesta(propuesta: PropuestaRuta) {
    if (!this.esAdmin() || !propuesta.id) return;

    await this.rutaService.updatePropuestaRuta(propuesta.id, {
      estado: 'rechazada',
      actualizadoEn: Timestamp.now(),
    });
  }

  async crearNota() {
    const nota = this.nuevaNota();

    if (!this.usuarioAuth) {
      alert('Debes iniciar sesion para agregar notas.');
      return;
    }

    if (!nota.rutaId || !nota.comentario.trim()) {
      alert('Selecciona una ruta y escribe la observacion.');
      return;
    }

    await this.rutaService.createNotaComunitaria({
      rutaId: nota.rutaId,
      usuarioId: this.usuarioAuth.uid,
      usuarioNombre: this.usuarioPerfil?.nombre || this.usuarioAuth.email || 'Ciudadano',
      comentario: nota.comentario,
      campoMarcado: nota.campoMarcado,
      estado: 'activa',
      votosUtiles: 0,
      confirmaciones: 0,
      creadoEn: Timestamp.now(),
    });

    this.nuevaNota.set({
      rutaId: '',
      campoMarcado: 'otro',
      comentario: '',
    });
  }

  votarNota(id?: string) {
    if (!id) return;
    this.rutaService.votarNotaUtil(id);
  }

  confirmarNota(id?: string) {
    if (!id) return;
    this.rutaService.confirmarNota(id);
  }

  notasPorRuta(rutaId?: string) {
    if (!rutaId) return [];
    return this.notas().filter((nota) => nota.rutaId === rutaId);
  }

  nombreRuta(rutaId: string) {
    return this.rutas().find((ruta) => ruta.id === rutaId)?.nombre || 'Ruta aprobada';
  }

  formatearFecha(timestamp?: Timestamp) {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
