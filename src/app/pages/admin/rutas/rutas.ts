import {
  Component,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Timestamp } from '@angular/fire/firestore';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import {
  RutaService,
  RutaTransporte,
  Coordenada,
  Parada,
} from '../../../services/ruta.service';
import { OpenRouteService } from '../../../services/open-route.service';

@Component({
  selector: 'app-rutas',
  imports: [FormsModule, Sidebar],
  templateUrl: './rutas.html',
  styleUrl: './rutas.scss',
})
export class Rutas implements AfterViewInit, OnDestroy {
  @ViewChild('mapaRutas') mapaRutas!: ElementRef<HTMLDivElement>;

  private rutaService = inject(RutaService);
  private openRouteService = inject(OpenRouteService);

  rutas = signal<RutaTransporte[]>([]);
  cargando = signal(false);
  calculandoRuta = signal(false);
  editandoId = signal<string | null>(null);

  private map!: L.Map;
  private recorridoLayer!: L.Polyline;
  private guiaLayer!: L.Polyline;
  private markersLayer = L.layerGroup();

  horas = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  minutos = ['00', '15', '30', '45'];
  periodos = ['AM', 'PM'];

  coloresRuta = [
    '#2563eb',
    '#16a34a',
    '#ea580c',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
    '#ca8a04',
    '#0f172a',
  ];

  nuevaRuta = signal({
    nombre: '',
    numero: '',
    precio: 0,
    horaInicio: '',
    horaFin: '',
    color: '#2563eb',
    estado: 'activa' as 'activa' | 'inactiva',
    descripcion: '',
  });

  puntosGuia = signal<Coordenada[]>([]);
  recorrido = signal<Coordenada[]>([]);
  paradas = signal<Parada[]>([]);

  ngAfterViewInit() {
    setTimeout(() => {
      this.iniciarMapa();
      this.cargarRutas();
    }, 500);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  iniciarMapa() {
    if (this.map) {
      this.map.remove();
    }

    const contenedor = this.mapaRutas.nativeElement;

    this.map = L.map(contenedor, {
      zoomControl: true,
      attributionControl: true,
    }).setView([15.5042, -88.025], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    this.guiaLayer = L.polyline([], {
      color: '#94a3b8',
      weight: 3,
      opacity: 0.7,
      dashArray: '8, 8',
    }).addTo(this.map);

    this.recorridoLayer = L.polyline([], {
      color: this.nuevaRuta().color,
      weight: 5,
      opacity: 0.9,
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.agregarPuntoGuia(e.latlng.lat, e.latlng.lng);
    });

    requestAnimationFrame(() => {
      this.map.invalidateSize();
    });

    setTimeout(() => {
      this.map.invalidateSize();
    }, 1000);
  }

  cargarRutas() {
    this.cargando.set(true);

    this.rutaService.getRutas().subscribe({
      next: (data) => {
        this.rutas.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.cargando.set(false);
      },
    });
  }

  actualizarCampo(campo: string, valor: any) {
    this.nuevaRuta.update((ruta) => ({
      ...ruta,
      [campo]: campo === 'precio' ? Number(valor) : valor,
    }));

    if (campo === 'color' && this.recorridoLayer) {
      this.recorridoLayer.setStyle({ color: valor });
    }
  }

  seleccionarColor(color: string) {
    this.actualizarCampo('color', color);
  }

  seleccionarHora(
    tipo: 'inicio' | 'fin',
    parte: 'hora' | 'minuto' | 'periodo',
    valor: string
  ) {
    const ruta = this.nuevaRuta();

    const actual =
      tipo === 'inicio'
        ? this.descomponerHora(ruta.horaInicio)
        : this.descomponerHora(ruta.horaFin);

    const nuevaHora = {
      ...actual,
      [parte]: valor,
    };

    const horaFormateada = `${nuevaHora.hora}:${nuevaHora.minuto} ${nuevaHora.periodo}`;

    this.actualizarCampo(
      tipo === 'inicio' ? 'horaInicio' : 'horaFin',
      horaFormateada
    );
  }

  descomponerHora(valor: string) {
    if (!valor) {
      return {
        hora: '06',
        minuto: '00',
        periodo: 'AM',
      };
    }

    const [horaMinuto, periodo] = valor.split(' ');
    const [hora, minuto] = horaMinuto.split(':');

    return {
      hora: hora || '06',
      minuto: minuto || '00',
      periodo: periodo || 'AM',
    };
  }

  obtenerHorario() {
    const ruta = this.nuevaRuta();

    if (!ruta.horaInicio || !ruta.horaFin) {
      return '';
    }

    return `${ruta.horaInicio} - ${ruta.horaFin}`;
  }

  parseHorario(horario: string) {
    if (!horario) {
      return {
        horaInicio: '',
        horaFin: '',
      };
    }

    if (horario.includes(' - ')) {
      const [horaInicio, horaFin] = horario.split(' - ');
      return { horaInicio, horaFin };
    }

    const limpio = horario
      .replace(/\s+/g, '')
      .replace(/a\.m\./gi, 'AM')
      .replace(/p\.m\./gi, 'PM')
      .replace(/am/gi, 'AM')
      .replace(/pm/gi, 'PM');

    const partes = limpio.split('a');

    return {
      horaInicio: partes[0]?.replace('AM', ' AM').replace('PM', ' PM') || '',
      horaFin: partes[1]?.replace('AM', ' AM').replace('PM', ' PM') || '',
    };
  }

  agregarPuntoGuia(lat: number, lng: number) {
    this.puntosGuia.update((actual) => [...actual, { lat, lng }]);
    this.recorrido.set([]);
    this.actualizarMapa();
  }

  calcularRutaPorCalles() {
    const puntos = this.puntosGuia();

    if (puntos.length < 2) {
      alert('Agrega al menos 2 puntos guía.');
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
        alert('No se pudo calcular la ruta.');
      },
    });
  }

  marcarUltimoComoParada() {
    const puntos = this.puntosGuia();

    if (puntos.length === 0) {
      alert('Primero agrega un punto.');
      return;
    }

    const ultimo = puntos[puntos.length - 1];

    const nombre = prompt(
      'Nombre de la parada:',
      `Parada ${this.paradas().length + 1}`
    );

    if (!nombre) return;

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
    this.editandoId.set(null);
    this.actualizarMapa();
  }

  actualizarMapa() {
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

      const marker = L.circleMarker([punto.lat, punto.lng], {
        radius: parada ? 9 : 6,
        color: parada ? '#16a34a' : '#2563eb',
        fillColor: parada ? '#16a34a' : '#2563eb',
        fillOpacity: 1,
        weight: 3,
      });

      marker.bindPopup(parada ? parada.nombre : `Punto guía ${index + 1}`);
      marker.addTo(this.markersLayer);
    });

    const boundsSource = recorrido.length > 0 ? recorrido : guia;

    if (boundsSource.length > 0) {
      this.map.fitBounds(L.latLngBounds(boundsSource), { padding: [30, 30] });
    }
  }

  editarRuta(ruta: RutaTransporte) {
    if (!ruta.id) return;

    const horario = this.parseHorario(ruta.horario);

    this.editandoId.set(ruta.id);

    this.nuevaRuta.set({
      nombre: ruta.nombre || '',
      numero: ruta.numero || '',
      precio: ruta.precio || 0,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
      color: ruta.color || '#2563eb',
      estado: ruta.estado || 'activa',
      descripcion: ruta.descripcion || '',
    });

    this.puntosGuia.set(ruta.puntosGuia || []);
    this.recorrido.set(ruta.recorrido || []);
    this.paradas.set(ruta.paradas || []);

    if (this.recorridoLayer) {
      this.recorridoLayer.setStyle({ color: ruta.color || '#2563eb' });
    }

    this.actualizarMapa();

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async guardarRuta() {
    const ruta = this.nuevaRuta();

    if (!ruta.nombre.trim() || !ruta.numero.trim()) {
      alert('Completa nombre y número.');
      return;
    }

    const data: Omit<RutaTransporte, 'id'> = {
      nombre: ruta.nombre,
      numero: ruta.numero,
      precio: Number(ruta.precio),
      horario: this.obtenerHorario(),
      color: ruta.color,
      estado: ruta.estado,
      descripcion: ruta.descripcion,
      puntosGuia: this.puntosGuia(),
      recorrido: this.recorrido(),
      paradas: this.paradas(),
      creadoEn: Timestamp.now(),
    };

    try {
      if (this.editandoId()) {
        await this.rutaService.updateRuta(this.editandoId()!, data);
      } else {
        await this.rutaService.createRuta(data);
      }

      this.resetFormulario();
    } catch (err) {
      console.error(err);
      alert('Error al guardar ruta.');
    }
  }

  async eliminarRuta(id?: string) {
    if (!id) return;

    if (!confirm('¿Eliminar ruta?')) return;

    await this.rutaService.deleteRuta(id);
  }

  resetFormulario() {
    this.nuevaRuta.set({
      nombre: '',
      numero: '',
      precio: 0,
      horaInicio: '',
      horaFin: '',
      color: '#2563eb',
      estado: 'activa',
      descripcion: '',
    });

    this.puntosGuia.set([]);
    this.recorrido.set([]);
    this.paradas.set([]);
    this.editandoId.set(null);
    this.actualizarMapa();
  }
}