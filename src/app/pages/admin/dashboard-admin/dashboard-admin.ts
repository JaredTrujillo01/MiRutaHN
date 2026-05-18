import { Component } from '@angular/core';
import { Sidebar } from '../../../layouts/sidebar/sidebar';

@Component({
  selector: 'app-dashboard-admin',
  imports: [Sidebar],
  templateUrl: './dashboard-admin.html',
  styleUrl: './dashboard-admin.scss',
})
export class DashboardAdmin {}
