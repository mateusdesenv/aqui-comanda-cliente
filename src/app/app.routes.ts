import { Routes } from '@angular/router';
import { AppLayoutComponent } from './components/app-layout.component';
import { CaixaPageComponent } from './pages/caixa-page.component';
import { CardapioPageComponent } from './pages/cardapio-page.component';
import { ClientesPageComponent } from './pages/clientes-page.component';
import { ColaboradoresPageComponent } from './pages/colaboradores-page.component';
import { ConstructionPageComponent } from './pages/construction-page.component';
import { ConfiguracoesPageComponent } from './pages/configuracoes-page.component';
import { FiliaisPageComponent } from './pages/filiais-page.component';
import { ImportarExportarPageComponent } from './pages/importar-exportar-page.component';
import { OrdemMenuPageComponent } from './pages/ordem-menu-page.component';
import { LoginPageComponent } from './pages/login-page.component';
import { MapaComandasPageComponent } from './pages/mapa-comandas-page.component';
import { MesasPageComponent } from './pages/mesas-page.component';
import { PedidosPageComponent } from './pages/pedidos-page.component';
import { authGuard, permissionGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'mapa' },
      { path: 'mapa', component: MapaComandasPageComponent, canActivate: [permissionGuard], data: { tela: 'mapa' } },
      { path: 'comandas', component: ConstructionPageComponent, canActivate: [permissionGuard], data: { tela: 'comandas', title: 'Comandas' } },
      { path: 'mesas', component: MesasPageComponent, canActivate: [permissionGuard], data: { tela: 'mesas' } },
      { path: 'clientes', component: ClientesPageComponent, canActivate: [permissionGuard], data: { tela: 'clientes' } },
      { path: 'pedidos', component: PedidosPageComponent, canActivate: [permissionGuard], data: { tela: 'pedidos' } },
      { path: 'colaboradores', component: ColaboradoresPageComponent, canActivate: [permissionGuard], data: { tela: 'colaboradores' } },
      { path: 'caixa', component: CaixaPageComponent, canActivate: [permissionGuard], data: { tela: 'caixa' } },
      { path: 'cardapio', component: CardapioPageComponent, canActivate: [permissionGuard], data: { tela: 'cardapio' } },
      { path: 'relatorios', component: ConstructionPageComponent, canActivate: [permissionGuard], data: { tela: 'relatorios', title: 'Relatórios' } },
      { path: 'configuracoes', pathMatch: 'full', redirectTo: 'configuracoes/personalizacoes' },
      { path: 'configuracoes/personalizacoes', component: ConfiguracoesPageComponent, canActivate: [permissionGuard], data: { tela: 'configuracoes' } },
      { path: 'configuracoes/ordem-menu', component: OrdemMenuPageComponent, canActivate: [permissionGuard], data: { tela: 'configuracoes' } },
      { path: 'configuracoes/filiais', component: FiliaisPageComponent, canActivate: [permissionGuard], data: { tela: 'configuracoes' } },
      { path: 'configuracoes/importar-exportar', component: ImportarExportarPageComponent, canActivate: [permissionGuard], data: { tela: 'configuracoes' } },
    ],
  },
  { path: '**', redirectTo: 'mapa' },
];
