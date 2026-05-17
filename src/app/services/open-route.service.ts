import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OpenRouteService {
  private http = inject(HttpClient);

  private apiUrl =
    'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

  obtenerRuta(coordenadas: number[][]) {
    const headers = new HttpHeaders({
      Authorization: environment.openRouteApiKey,
      'Content-Type': 'application/json',
    });

    const body = {
      coordinates: coordenadas,
    };

    return this.http.post<any>(this.apiUrl, body, { headers });
  }
}