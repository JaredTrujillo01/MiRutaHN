import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import * as L from 'leaflet';

import { Sidebar } from '../../../layouts/sidebar/sidebar';
import { Buscar } from '../../../components/buscar/buscar';
import { ResultadosBusqueda } from '../../../components/resultados-busqueda/resultados-busqueda';
import { DetalleRuta } from '../../../components/detalle-ruta/detalle-ruta';
import { RutaService, RutaTransporte } from '../../../services/ruta.service';

@Component({
  selector: 'app-dashboard',
  imports: [Sidebar, Buscar, ResultadosBusqueda, DetalleRuta],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements AfterViewInit, OnDestroy {
  @ViewChild('mapaExplorar') mapaExplorar!: ElementRef<HTMLDivElement>;
  @ViewChild('mapaDetalle') mapaDetalle?: ElementRef<HTMLDivElement>;
  @ViewChild(Buscar) buscador?: Buscar;

  private rutaService = inject(RutaService);

  paso = signal(1);
  rutas = signal<RutaTransporte[]>([]);
  rutasFiltradas = signal<RutaTransporte[]>([]);
  rutaSeleccionada = signal<RutaTransporte | null>(null);
  terminoBusqueda = signal('');
  cargandoRutas = signal(true);

  private map?: L.Map;
  private detailMap?: L.Map;

  private rutasLayer = L.layerGroup();
  private paradasLayer = L.layerGroup();
  private detalleRutaLayer = L.layerGroup();
  private detalleParadasLayer = L.layerGroup();

  ngAfterViewInit() {
    setTimeout(() => {
      this.iniciarMapa();
      this.cargarRutas();
    }, 300);
  }

  ngOnDestroy() {
    this.map?.off();
    this.map?.remove();
    this.detailMap?.off();
    this.detailMap?.remove();
  }

  iniciarMapa() {
    if (!this.mapaExplorar) return;

    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = undefined;
    }

    this.map = L.map(this.mapaExplorar.nativeElement, {
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView(
      [15.5042, -88.025],
      13
    );

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.rutasLayer = L.layerGroup().addTo(this.map);
    this.paradasLayer = L.layerGroup().addTo(this.map);

    setTimeout(() => this.map?.invalidateSize({ animate: false }), 400);
  }

  cargarRutas() {
    this.cargandoRutas.set(true);

    this.rutaService.getRutas().subscribe({
      next: (rutas) => {
        const activas = rutas.filter((ruta) => ruta.estado === 'activa');

        this.rutas.set(activas);
        this.rutasFiltradas.set(activas);
        this.cargandoRutas.set(false);

        setTimeout(() => this.dibujarRutas(activas), 300);
      },
      error: (err) => {
        console.error(err);
        this.cargandoRutas.set(false);
      },
    });
  }

  abrirBusqueda() {
    this.paso.set(2);
  }

  cancelarBusqueda() {
    this.paso.set(1);
    this.terminoBusqueda.set('');
    this.rutasFiltradas.set(this.rutas());
    this.rutaSeleccionada.set(null);

    setTimeout(() => {
      this.map?.invalidateSize();
      this.dibujarRutas(this.rutas());
    }, 250);
  }

  buscarRutas(termino: string) {
    const origen = this.buscador?.origen() || '';
    const destino = termino || this.buscador?.destino() || '';
    const resumenBusqueda = [origen.trim(), destino.trim()]
      .filter(Boolean)
      .join(' → ');

    this.terminoBusqueda.set(resumenBusqueda);

    const filtradas = this.rutas()
      .filter((ruta) => ruta.estado === 'activa')
      .map((ruta, indice) => ({
        ...this.coincideRuta(ruta, origen, destino),
        indice,
      }))
      .filter((resultado) => resultado.score > 0)
      .sort(
        (a, b) => b.score - a.score || a.indice - b.indice
      )
      .map((resultado) => resultado.ruta);

    this.rutasFiltradas.set(filtradas);
    this.dibujarRutas(filtradas);
    this.paso.set(3);
  }

  normalizarTexto(valor: unknown): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  textoRuta(ruta: RutaTransporte): string {
    const datosOpcionales = ruta as RutaTransporte &
      Record<string, unknown>;

    return this.normalizarTexto(
      [
        ruta.nombre,
        ruta.numero,
        ruta.descripcion,
        ruta.horario,
        ruta.frecuencia,
        ...(ruta.paradas || []).map((parada) => parada.nombre),
        this.extraerTexto(datosOpcionales['zonas']),
        this.extraerTexto(datosOpcionales['referencias']),
        this.extraerTexto(datosOpcionales['puntosGuia']),
        this.extraerTexto(datosOpcionales['recorrido']),
      ].join(' ')
    );
  }

  coincideRuta(
    ruta: RutaTransporte,
    origen: string,
    destino: string
  ): { ruta: RutaTransporte; score: number } {
    const origenNormalizado = this.normalizarTexto(origen);
    const destinoNormalizado = this.normalizarTexto(destino);
    const textoGeneral = this.textoRuta(ruta);
    const textoParadas = this.normalizarTexto(
      (ruta.paradas || []).map((parada) => parada.nombre).join(' ')
    );
    const textoPrincipal = this.normalizarTexto(
      [ruta.nombre, ruta.numero, ruta.descripcion].join(' ')
    );

    const coincideOrigen = this.coincideTexto(
      textoGeneral,
      origenNormalizado
    );
    const coincideDestino = this.coincideTexto(
      textoGeneral,
      destinoNormalizado
    );
    const origenEnParadas = this.coincideTexto(
      textoParadas,
      origenNormalizado
    );
    const destinoEnParadas = this.coincideTexto(
      textoParadas,
      destinoNormalizado
    );

    let score = 0;

    if (coincideOrigen && coincideDestino) {
      score = origenEnParadas && destinoEnParadas ? 100 : 80;
    } else if (coincideDestino) {
      score = 50;
    } else if (coincideOrigen) {
      score = 40;
    } else if (
      this.coincideTextoGeneral(
        textoPrincipal,
        origenNormalizado,
        destinoNormalizado
      )
    ) {
      score = 20;
    }

    if (score >= 40 && score < 100) {
      if (destinoEnParadas) score += 5;
      if (origenEnParadas) score += 3;
    }

    return { ruta, score };
  }

  private coincideTexto(texto: string, criterio: string): boolean {
    if (!texto || !criterio) return false;
    if (texto.includes(criterio)) return true;

    const palabras = criterio.split(' ').filter(Boolean);
    return palabras.length > 1 && palabras.every((palabra) => texto.includes(palabra));
  }

  private coincideTextoGeneral(
    texto: string,
    origen: string,
    destino: string
  ): boolean {
    const palabras = [origen, destino]
      .flatMap((criterio) => criterio.split(' '))
      .filter((palabra) => palabra.length >= 3);

    return palabras.some((palabra) => texto.includes(palabra));
  }

  private extraerTexto(valor: unknown): string {
    if (typeof valor === 'string') return valor.trim();

    if (Array.isArray(valor)) {
      return valor.map((item) => this.extraerTexto(item)).filter(Boolean).join(' ');
    }

    if (valor && typeof valor === 'object') {
      return Object.values(valor)
        .map((item) => this.extraerTexto(item))
        .filter(Boolean)
        .join(' ');
    }

    return '';
  }

  verDetalle(ruta: RutaTransporte) {
    this.rutaSeleccionada.set(ruta);
    this.paso.set(4);

    this.map?.off();
    this.map?.remove();
    this.map = undefined;

    setTimeout(() => {
      this.iniciarMapaDetalle();
      this.dibujarRutaEnMapaDetalle(ruta);
    }, 300);
  }

  volverAResultados() {
    this.paso.set(1);
    this.rutaSeleccionada.set(null);
    this.terminoBusqueda.set('');
    this.rutasFiltradas.set(this.rutas());

    if (this.detailMap) {
      this.detailMap.off();
      this.detailMap.remove();
      this.detailMap = undefined;
    }

    setTimeout(() => {
      this.iniciarMapa();

      setTimeout(() => {
        this.dibujarRutas(this.rutas());
      }, 300);
    }, 300);
  }

  iniciarMapaDetalle() {
    if (!this.mapaDetalle) return;

    if (this.detailMap) {
      this.detailMap.off();
      this.detailMap.remove();
      this.detailMap = undefined;
    }

    this.detailMap = L.map(this.mapaDetalle.nativeElement, {
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView(
      [15.5042, -88.025],
      13
    );

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.detailMap);

    this.detalleRutaLayer = L.layerGroup().addTo(this.detailMap);
    this.detalleParadasLayer = L.layerGroup().addTo(this.detailMap);

    setTimeout(() => this.detailMap?.invalidateSize({ animate: false }), 300);
  }

  dibujarRutas(rutas: RutaTransporte[]) {
    if (!this.map) return;

    this.rutasLayer.clearLayers();
    this.paradasLayer.clearLayers();

    const bounds: [number, number][] = [];

    rutas.forEach((ruta) => {
      const recorrido = this.obtenerRecorrido(ruta);

      if (recorrido.length > 0) {
        L.polyline(recorrido, {
          color: ruta.color || '#1d4ed8',
          weight: 5,
          opacity: 0.75,
        })
          .bindTooltip(`${ruta.nombre} - Ruta ${ruta.numero}`, {
            sticky: true,
            direction: 'top',
          })
          .on('mouseover', (e) => {
            e.target.setStyle({ weight: 8, opacity: 1 });
          })
          .on('mouseout', (e) => {
            e.target.setStyle({ weight: 5, opacity: 0.75 });
          })
          .on('click', () => this.verDetalle(ruta))
          .addTo(this.rutasLayer);

        bounds.push(...recorrido);
      }

      ruta.paradas?.forEach((parada) => {
        L.circleMarker([parada.lat, parada.lng], {
          radius: 5,
          color: ruta.color || '#1d4ed8',
          fillColor: ruta.color || '#1d4ed8',
          fillOpacity: 1,
          weight: 2,
        })
          .bindTooltip(`${parada.nombre} · ${ruta.nombre}`)
          .addTo(this.paradasLayer);
      });
    });

    if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), {
        padding: [40, 40],
        animate: false,
      });
    }
  }

  dibujarRutaEnMapaDetalle(ruta: RutaTransporte) {
    if (!this.detailMap) return;

    this.detalleRutaLayer.clearLayers();
    this.detalleParadasLayer.clearLayers();

    const recorrido = this.obtenerRecorrido(ruta);

    if (recorrido.length > 0) {
      L.polyline(recorrido, {
        color: ruta.color || '#1d4ed8',
        weight: 7,
        opacity: 0.95,
      })
        .bindTooltip(`${ruta.nombre} - Ruta ${ruta.numero}`, { sticky: true })
        .addTo(this.detalleRutaLayer);

      this.detailMap.fitBounds(L.latLngBounds(recorrido), {
        padding: [40, 40],
        animate: false,
      });
    }

    ruta.paradas?.forEach((parada) => {
      L.circleMarker([parada.lat, parada.lng], {
        radius: 8,
        color: '#15803d',
        fillColor: '#15803d',
        fillOpacity: 1,
        weight: 3,
      })
        .bindTooltip(parada.nombre)
        .addTo(this.detalleParadasLayer);
    });
  }

  obtenerRecorrido(ruta: RutaTransporte): [number, number][] {
    const puntos =
      ruta.recorrido && ruta.recorrido.length > 0
        ? ruta.recorrido
        : ruta.puntosGuia || [];

    return puntos.map((punto) => [punto.lat, punto.lng] as [number, number]);
  }
}
