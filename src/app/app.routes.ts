import { Routes } from '@angular/router';
import { authGuard, importExportAvailabilityGuard, loginGuard, permissionGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login-page.component').then((module) => module.LoginPageComponent),
    canActivate: [loginGuard],
  },
  {
    path: '',
    loadComponent: () => import('./components/app-layout.component').then((module) => module.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard-page.component').then((module) => module.DashboardPageComponent), canActivate: [permissionGuard], data: { tela: 'dashboard' } },
      { path: 'mapa', loadComponent: () => import('./pages/mapa-comandas-page.component').then((module) => module.MapaComandasPageComponent), canActivate: [permissionGuard], data: { tela: 'mapa' } },
      { path: 'comandas', loadComponent: () => import('./pages/construction-page.component').then((module) => module.ConstructionPageComponent), canActivate: [permissionGuard], data: { tela: 'comandas', title: 'Comandas' } },
      { path: 'mesas', loadComponent: () => import('./pages/mesas-page.component').then((module) => module.MesasPageComponent), canActivate: [permissionGuard], data: { tela: 'mesas' } },
      { path: 'clientes', loadComponent: () => import('./pages/clientes-page.component').then((module) => module.ClientesPageComponent), canActivate: [permissionGuard], data: { tela: 'clientes' } },
      { path: 'pedidos', loadComponent: () => import('./pages/pedidos-page.component').then((module) => module.PedidosPageComponent), canActivate: [permissionGuard], data: { tela: 'pedidos' } },
      { path: 'colaboradores', loadComponent: () => import('./pages/colaboradores-page.component').then((module) => module.ColaboradoresPageComponent), canActivate: [permissionGuard], data: { tela: 'colaboradores' } },
      { path: 'caixa', loadComponent: () => import('./pages/caixa-page.component').then((module) => module.CaixaPageComponent), canActivate: [permissionGuard], data: { tela: 'caixa' } },
      { path: 'cardapio', pathMatch: 'full', redirectTo: 'cardapio/produtos' },
      { path: 'cardapio/produtos', loadComponent: () => import('./pages/cardapio-page.component').then((module) => module.CardapioPageComponent), canActivate: [permissionGuard], data: { tela: 'cardapio' } },
      { path: 'cardapio/categorias', loadComponent: () => import('./pages/produto-categorias-page.component').then((module) => module.ProdutoCategoriasPageComponent), canActivate: [permissionGuard], data: { tela: 'cardapio' } },
      { path: 'estoque/gestao', loadComponent: () => import('./pages/stock-management-page.component').then((module) => module.StockManagementPageComponent), canActivate: [permissionGuard], data: { tela: 'estoque' } },
      { path: 'estoque/entradas', loadComponent: () => import('./pages/stock-entries-page.component').then((module) => module.StockEntriesPageComponent), canActivate: [permissionGuard], data: { tela: 'estoque' } },
      { path: 'relatorios', loadComponent: () => import('./pages/construction-page.component').then((module) => module.ConstructionPageComponent), canActivate: [permissionGuard], data: { tela: 'relatorios', title: 'Relatórios' } },
      { path: 'configuracoes', pathMatch: 'full', redirectTo: 'configuracoes/personalizacoes' },
      { path: 'configuracoes/personalizacoes', loadComponent: () => import('./pages/configuracoes-page.component').then((module) => module.ConfiguracoesPageComponent), canActivate: [permissionGuard], data: { tela: 'configuracoes' } },
      { path: 'configuracoes/ordem-menu', loadComponent: () => import('./pages/ordem-menu-page.component').then((module) => module.OrdemMenuPageComponent), canActivate: [permissionGuard], data: { tela: 'configuracoes' } },
      { path: 'configuracoes/filiais', loadComponent: () => import('./pages/filiais-page.component').then((module) => module.FiliaisPageComponent), canActivate: [permissionGuard], data: { tela: 'configuracoes' } },
      { path: 'configuracoes/importar-exportar', loadComponent: () => import('./pages/importar-exportar-page.component').then((module) => module.ImportarExportarPageComponent), canActivate: [importExportAvailabilityGuard, permissionGuard], data: { tela: 'configuracoes' } },
    ],
  },
  { path: '**', redirectTo: 'mapa' },
];
