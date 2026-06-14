import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';

import { Navbar } from '../../../layouts/navbar/navbar';
import { Footer } from '../../../layouts/footer/footer';
import { RutaService, RutaTransporte } from '../../../services/ruta.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements AfterViewInit, OnDestroy {
  @ViewChild('landingMap') landingMap!: ElementRef<HTMLDivElement>;

  private rutaService = inject(RutaService);

  private map?: L.Map;
  private routeLayer?: L.Polyline;
  private markersLayer = L.layerGroup();
  private mapTimeout?: ReturnType<typeof setTimeout>;

  scrollTo(sectionId: string) {
    const element = document.getElementById(sectionId);

    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }

  ngAfterViewInit() {
    this.mapTimeout = setTimeout(() => {
      this.iniciarMapaLanding();
      this.cargarRutaPublica();
    }, 300);
  }

  ngOnDestroy() {
    if (this.mapTimeout) {
      clearTimeout(this.mapTimeout);
    }

    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = undefined;
    }
  }

  private iniciarMapaLanding() {
    if (!this.landingMap?.nativeElement || this.map) return;

    this.map = L.map(this.landingMap.nativeElement, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false,
    }).setView([15.5042, -88.025], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 250);
  }

  private cargarRutaPublica() {
    this.rutaService.getRutas().subscribe({
      next: (rutas) => {
        const ruta = rutas.find(
          (item) =>
            item.estado === 'activa' &&
            ((item.recorrido?.length || 0) >= 2 ||
              (item.puntosGuia?.length || 0) >= 2)
        );

        if (ruta) {
          this.dibujarRuta(ruta);
        } else {
          this.dibujarRutaDemo();
        }
      },
      error: () => {
        this.dibujarRutaDemo();
      },
    });
  }

  private dibujarRuta(ruta: RutaTransporte) {
    const puntos = ruta.recorrido?.length ? ruta.recorrido : ruta.puntosGuia || [];

    if (!this.map || puntos.length < 2) {
      this.dibujarRutaDemo();
      return;
    }

    const latLngs = puntos.map((punto) => [punto.lat, punto.lng] as [number, number]);

    this.routeLayer?.remove();

    this.routeLayer = L.polyline(latLngs, {
      color: ruta.color || '#2563eb',
      weight: 5,
      opacity: 0.9,
    }).addTo(this.map);

    this.markersLayer.clearLayers();

    const inicio = latLngs[0];
    const fin = latLngs[latLngs.length - 1];

    L.circleMarker(inicio, {
      radius: 7,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 1,
      weight: 3,
    }).addTo(this.markersLayer);

    L.circleMarker(fin, {
      radius: 7,
      color: '#16a34a',
      fillColor: '#16a34a',
      fillOpacity: 1,
      weight: 3,
    }).addTo(this.markersLayer);

    this.map.fitBounds(L.latLngBounds(latLngs), {
      padding: [25, 25],
      animate: false,
    });
  }

  private dibujarRutaDemo() {
    if (!this.map) return;

    const puntos: [number, number][] = [
      [15.5128, -88.0366],
      [15.5088, -88.0304],
      [15.5042, -88.025],
      [15.4993, -88.018],
    ];

    this.routeLayer?.remove();

    this.routeLayer = L.polyline(puntos, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.9,
    }).addTo(this.map);

    this.markersLayer.clearLayers();

    L.circleMarker(puntos[0], {
      radius: 7,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 1,
      weight: 3,
    }).addTo(this.markersLayer);

    L.circleMarker(puntos[puntos.length - 1], {
      radius: 7,
      color: '#16a34a',
      fillColor: '#16a34a',
      fillOpacity: 1,
      weight: 3,
    }).addTo(this.markersLayer);

    this.map.fitBounds(L.latLngBounds(puntos), {
      padding: [25, 25],
      animate: false,
    });
  }
}