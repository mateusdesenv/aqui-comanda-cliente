import { computed, inject, Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { ApiBackedState } from '../core/api/api-backed-state';
import { TelaSistema } from '../models/app-data';
import type { IconName } from '../components/icon.component';

export interface NavigationMenuItem {
  id: string;
  label: string;
  path?: string;
  icon: IconName;
  tela: TelaSistema;
  disabled?: boolean;
  badge?: string;
  children?: NavigationMenuItem[];
}

export const defaultMenuItems: NavigationMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'dollar', tela: 'dashboard' },
  { id: 'mapa', label: 'Mapa de Comandas', path: '/mapa', icon: 'commandMap', tela: 'mapa' },
  { id: 'comandas', label: 'Comandas', path: '/comandas', icon: 'receipt', tela: 'comandas', disabled: true, badge: 'Em breve' },
  { id: 'mesas', label: 'Mesas', path: '/mesas', icon: 'table', tela: 'mesas' },
  { id: 'clientes', label: 'Clientes', path: '/clientes', icon: 'users', tela: 'clientes' },
  { id: 'pedidos', label: 'Pedidos', path: '/pedidos', icon: 'bell', tela: 'pedidos' },
  { id: 'colaboradores', label: 'Colaboradores', path: '/colaboradores', icon: 'shield', tela: 'colaboradores' },
  { id: 'caixa', label: 'Caixa', path: '/caixa', icon: 'register', tela: 'caixa' },
  { id: 'cardapio', label: 'Cardápio', path: '/cardapio', icon: 'cards', tela: 'cardapio' },
  {
    id: 'estoque',
    label: 'Estoque',
    icon: 'register',
    tela: 'estoque',
    children: [
      {
        id: 'estoque-gestao',
        label: 'Gestão de Estoque',
        path: '/estoque/gestao',
        icon: 'register',
        tela: 'estoque',
      },
      {
        id: 'estoque-entradas',
        label: 'Entradas de estoque',
        path: '/estoque/entradas',
        icon: 'register',
        tela: 'estoque',
      },
    ],
  },
  { id: 'relatorios', label: 'Relatórios', path: '/relatorios', icon: 'file', tela: 'relatorios', disabled: true, badge: 'Em breve' },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: 'settings',
    tela: 'configuracoes',
    children: [
      {
        id: 'configuracoes-personalizacoes',
        label: 'Personalizações do sistema',
        path: '/configuracoes/personalizacoes',
        icon: 'settings',
        tela: 'configuracoes',
      },
      {
        id: 'configuracoes-ordem-menu',
        label: 'Ordem do menu',
        path: '/configuracoes/ordem-menu',
        icon: 'menu',
        tela: 'configuracoes',
      },
      {
        id: 'configuracoes-filiais',
        label: 'Lojas / Filiais',
        path: '/configuracoes/filiais',
        icon: 'settings',
        tela: 'configuracoes',
      },
      {
        id: 'configuracoes-importar-exportar',
        label: 'Importar / Exportar',
        path: '/configuracoes/importar-exportar',
        icon: 'file',
        tela: 'configuracoes',
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class MenuOrderService extends ApiBackedState {
  private readonly api = inject(ApiClientService);
  private readonly order = signal<string[]>([]);

  readonly menuItems = computed(() => this.applyOrder(defaultMenuItems, this.order()));


  getDefaultMenuItems(): NavigationMenuItem[] {
    return [...defaultMenuItems];
  }

  getOrderedMenuItems(): NavigationMenuItem[] {
    return [...this.menuItems()];
  }

  clearData(): void {
    super.clearLoadState();
    this.order.set([]);
  }

  saveOrder(order: string[]): void {
    const normalizedOrder = this.normalizeOrder(order);
    this.order.set(normalizedOrder);
    void lastValueFrom(this.api.put<{ menuOrder: string[] }>('/configuracoes/menu-order', { menuOrder: normalizedOrder })).then((settings) => {
      this.order.set(this.normalizeOrder(settings.menuOrder ?? []));
    }).catch(() => this.reload().catch(() => undefined));
  }

  restoreDefaultOrder(): void {
    this.order.set([]);
    void lastValueFrom(this.api.put<{ menuOrder: string[] }>('/configuracoes/menu-order', { menuOrder: [] }))
      .catch(() => this.reload().catch(() => undefined));
  }

  private applyOrder(menuItems: NavigationMenuItem[], order: string[]): NavigationMenuItem[] {
    const validItems = new Map(menuItems.map((item) => [item.id, item]));
    const orderedItems = order
      .map((itemId) => validItems.get(itemId))
      .filter((item): item is NavigationMenuItem => Boolean(item));
    const orderedIds = new Set(orderedItems.map((item) => item.id));
    const newOrMissingItems = menuItems.filter((item) => !orderedIds.has(item.id));

    return [...orderedItems, ...newOrMissingItems];
  }

  private normalizeOrder(order: unknown[]): string[] {
    const validIds = new Set(defaultMenuItems.map((item) => item.id));
    const normalizedOrder: string[] = [];

    for (const itemId of order) {
      if (typeof itemId !== 'string' || !validIds.has(itemId)) {
        continue;
      }

      if (!normalizedOrder.includes(itemId)) {
        normalizedOrder.push(itemId);
      }
    }

    return normalizedOrder;
  }

  protected override async loadFromApi(): Promise<void> {
    const settings = await lastValueFrom(this.api.get<{ menuOrder: string[] }>('/configuracoes/menu-order'));
    this.order.set(this.normalizeOrder(settings.menuOrder ?? []));
  }
}
