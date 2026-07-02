import { computed, Injectable, signal } from '@angular/core';
import { TelaSistema } from '../models/app-data';
import type { IconName } from '../components/icon.component';

export interface NavigationMenuItem {
  id: TelaSistema;
  label: string;
  path: string;
  icon: IconName;
  tela: TelaSistema;
  disabled?: boolean;
  badge?: string;
}

const MENU_ORDER_KEY = 'aqui-comanda:menu-order';

export const defaultMenuItems: NavigationMenuItem[] = [
  { id: 'mapa', label: 'Mapa de Comandas', path: '/mapa', icon: 'commandMap', tela: 'mapa' },
  { id: 'comandas', label: 'Comandas', path: '/comandas', icon: 'receipt', tela: 'comandas', disabled: true, badge: 'Em breve' },
  { id: 'mesas', label: 'Mesas', path: '/mesas', icon: 'table', tela: 'mesas' },
  { id: 'clientes', label: 'Clientes', path: '/clientes', icon: 'users', tela: 'clientes' },
  { id: 'pedidos', label: 'Pedidos', path: '/pedidos', icon: 'bell', tela: 'pedidos' },
  { id: 'colaboradores', label: 'Colaboradores', path: '/colaboradores', icon: 'shield', tela: 'colaboradores' },
  { id: 'caixa', label: 'Caixa', path: '/caixa', icon: 'register', tela: 'caixa' },
  { id: 'cardapio', label: 'Cardápio', path: '/cardapio', icon: 'cards', tela: 'cardapio' },
  { id: 'relatorios', label: 'Relatórios', path: '/relatorios', icon: 'file', tela: 'relatorios', disabled: true, badge: 'Em breve' },
  { id: 'configuracoes', label: 'Configurações', path: '/configuracoes', icon: 'settings', tela: 'configuracoes' },
];

@Injectable({ providedIn: 'root' })
export class MenuOrderService {
  private readonly order = signal<TelaSistema[]>(this.readOrder());

  readonly menuItems = computed(() => this.applyOrder(defaultMenuItems, this.order()));

  getDefaultMenuItems(): NavigationMenuItem[] {
    return [...defaultMenuItems];
  }

  getOrderedMenuItems(): NavigationMenuItem[] {
    return [...this.menuItems()];
  }

  saveOrder(order: TelaSistema[]): void {
    const normalizedOrder = this.normalizeOrder(order);
    this.order.set(normalizedOrder);
    this.writeOrder(normalizedOrder);
  }

  restoreDefaultOrder(): void {
    this.order.set([]);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(MENU_ORDER_KEY);
    }
  }

  private applyOrder(menuItems: NavigationMenuItem[], order: TelaSistema[]): NavigationMenuItem[] {
    const validItems = new Map(menuItems.map((item) => [item.id, item]));
    const orderedItems = order
      .map((itemId) => validItems.get(itemId))
      .filter((item): item is NavigationMenuItem => Boolean(item));
    const orderedIds = new Set(orderedItems.map((item) => item.id));
    const newOrMissingItems = menuItems.filter((item) => !orderedIds.has(item.id));

    return [...orderedItems, ...newOrMissingItems];
  }

  private readOrder(): TelaSistema[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const storedOrder = localStorage.getItem(MENU_ORDER_KEY);

      if (!storedOrder) {
        return [];
      }

      const parsedOrder = JSON.parse(storedOrder);

      if (!Array.isArray(parsedOrder)) {
        localStorage.removeItem(MENU_ORDER_KEY);
        return [];
      }

      return this.normalizeOrder(parsedOrder);
    } catch {
      localStorage.removeItem(MENU_ORDER_KEY);
      return [];
    }
  }

  private writeOrder(order: TelaSistema[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(order));
  }

  private normalizeOrder(order: unknown[]): TelaSistema[] {
    const validIds = new Set(defaultMenuItems.map((item) => item.id));
    const normalizedOrder: TelaSistema[] = [];

    for (const itemId of order) {
      if (typeof itemId !== 'string' || !validIds.has(itemId as TelaSistema)) {
        continue;
      }

      const tela = itemId as TelaSistema;

      if (!normalizedOrder.includes(tela)) {
        normalizedOrder.push(tela);
      }
    }

    return normalizedOrder;
  }
}
