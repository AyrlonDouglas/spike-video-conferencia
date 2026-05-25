import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ConsultaComponent } from './consulta/consulta.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'consulta/:sessionId', component: ConsultaComponent },
];
