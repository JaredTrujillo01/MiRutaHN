import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Sidebar } from '../../../layouts/sidebar/sidebar';

@Component({
  selector: 'app-favoritos',
  imports: [Sidebar],
  templateUrl: './favoritos.html',
  styleUrl: './favoritos.scss',
})
export class Favoritos {
  favoritos = signal([
    {
      id: 1,
      nombre: 'Casa → Trabajo',
      ruta: 'Colonia Palmira a Centro Corporativo',
      icono: 'home',
      color: 'blue',
      tiempo: '25 min',
      precio: 'L. 15.00',
    },
    {
      id: 2,
      nombre: 'Casa → Universidad',
      ruta: 'Colonia Palmira a UNAH',
      icono: 'school',
      color: 'orange',
      tiempo: '45 min',
      precio: 'L. 13.00',
    },
    {
      id: 3,
      nombre: 'Mall → Casa',
      ruta: 'Multiplaza a Colonia Palmira',
      icono: 'shopping_bag',
      color: 'green',
      tiempo: '15 min',
      precio: 'L. 15.00',
    },
  ]);

  constructor(private router: Router) {}

  verRuta(ruta: any) {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        paso: 4,
        rutaId: ruta.id,
      },
    });
  }

  eliminarFavorito(id: number) {
    this.favoritos.update((items) => items.filter((item) => item.id !== id));
  }
}