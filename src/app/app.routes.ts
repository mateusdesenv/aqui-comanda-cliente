import { Routes } from '@angular/router';
import { AppLayoutComponent } from './components/app-layout.component';
import { CardapioPageComponent } from './pages/cardapio-page.component';
import { ConstructionPageComponent } from './pages/construction-page.component';
import { LoginPageComponent } from './pages/login-page.component';
import { MapaComandasPageComponent } from './pages/mapa-comandas-page.component';
import { MesasPageComponent } from './pages/mesas-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'mapa' },
      { path: 'mapa', component: MapaComandasPageComponent },
      { path: 'comandas', component: ConstructionPageComponent, data: { title: 'Comandas' } },
      { path: 'mesas', component: MesasPageComponent },
      { path: 'pedidos', component: ConstructionPageComponent, data: { title: 'Pedidos' } },
      { path: 'caixa', component: ConstructionPageComponent, data: { title: 'Caixa' } },
      { path: 'cardapio', component: CardapioPageComponent },
      { path: 'relatorios', component: ConstructionPageComponent, data: { title: 'Relatórios' } },
      { path: 'configuracoes', component: ConstructionPageComponent, data: { title: 'Configurações' } },
    ],
  },
  { path: '**', redirectTo: 'mapa' },
];
