import { Injectable, computed, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { ApiBackedState } from '../core/api/api-backed-state';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { ItemPedido, Pedido, PedidoPaymentMethod, PedidoStatus } from '../models/app-data';

export interface PedidoPayload {
  clienteId?: string;
  clienteNome: string;
  telefone?: string;
  cepEntrega?: string;
  enderecoEntrega: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoesEntrega?: string;
  itens: ItemPedido[];
  formaPagamento?: PedidoPaymentMethod;
  trocoPara?: number;
  observacoesPedido?: string;
  status?: PedidoStatus;
  justificativaCancelamento?: string;
}

@Injectable({ providedIn: 'root' })
export class PedidosService extends ApiBackedState {
  private readonly api = inject(ApiClientService);
  private readonly workflowStatusSequence: PedidoStatus[] = ['aberto', 'em_preparo', 'saiu_entrega', 'entregue'];

  readonly pedidos = signal<Pedido[]>([]);
  readonly pedidosAtivos = computed(() =>
    this.pedidos().filter((pedido) => !['entregue', 'cancelado'].includes(pedido.status)),
  );


  getPedidos(): Pedido[] {
    return this.pedidos();
  }

  clearData(): void {
    super.clearLoadState();
    this.pedidos.set([]);
  }

  getPedidosAtivos(): Pedido[] {
    return this.pedidosAtivos();
  }

  async createPedido(payload: PedidoPayload): Promise<Pedido> {
    const created = await lastValueFrom(this.api.post<Pedido>('/pedidos', payload));
    const pedido = this.mapPedido(created);
    await this.reload();
    return pedido;
  }

  async updatePedido(id: string, payload: PedidoPayload): Promise<Pedido | null> {
    const existingPedido = this.pedidos().find((pedido) => pedido.id === id);

    if (!existingPedido) {
      return null;
    }

    const nextStatus = payload.status ?? existingPedido.status;
    const justificativaCancelamento = payload.justificativaCancelamento?.trim();

    if (nextStatus === 'cancelado' && !justificativaCancelamento) {
      return null;
    }

    const updated = await lastValueFrom(this.api.put<Pedido>(`/pedidos/${id}`, payload));
    const pedido = this.mapPedido(updated);
    await this.reload();
    return pedido;
  }

  confirmPayment(id: string): Pedido | null {
    let updatedPedido: Pedido | null = null;

    this.pedidos.set(
      this.sortByCreatedAt(
        this.pedidos().map((pedido) => {
          if (pedido.id !== id) {
            return pedido;
          }

          updatedPedido = {
            ...pedido,
            pagamentoConfirmado: true,
            updatedAt: new Date().toISOString(),
          };
          return updatedPedido;
        }),
      ),
    );
    void lastValueFrom(this.api.post<Pedido>(`/pedidos/${id}/confirmar-pagamento`, {})).then((updated) => {
      this.pedidos.set(this.sortByCreatedAt(this.pedidos().map((pedido) => (pedido.id === id ? this.mapPedido(updated) : pedido))));
    }).catch(() => this.reload().catch(() => undefined));
    return updatedPedido;
  }

  updateStatus(id: string, status: PedidoStatus): Pedido | null {
    if (!this.workflowStatusSequence.includes(status)) {
      return null;
    }

    let updatedPedido: Pedido | null = null;

    this.pedidos.set(
      this.sortByCreatedAt(
        this.pedidos().map((pedido) => {
          if (pedido.id !== id || !this.workflowStatusSequence.includes(pedido.status)) {
            return pedido;
          }

          updatedPedido = {
            ...pedido,
            status,
            justificativaCancelamento: undefined,
            updatedAt: new Date().toISOString(),
          };
          return updatedPedido;
        }),
      ),
    );
    void lastValueFrom(this.api.patch<Pedido>(`/pedidos/${id}/status`, { status })).then((updated) => {
      this.pedidos.set(this.sortByCreatedAt(this.pedidos().map((pedido) => (pedido.id === id ? this.mapPedido(updated) : pedido))));
    }).catch(() => this.reload().catch(() => undefined));
    return updatedPedido;
  }

  deletePedido(id: string): void {
    this.pedidos.set(this.pedidos().filter((pedido) => pedido.id !== id));
    void lastValueFrom(this.api.delete(`/pedidos/${id}`)).catch(() => this.reload().catch(() => undefined));
  }

  private normalizePedidos(pedidos: Pedido[]): Pedido[] {
    return pedidos.map((pedido, index) => {
      const itens = this.normalizeItems(pedido.itens ?? []);

      return {
        ...mapApiEntity(pedido),
        codigo: pedido.codigo || `PED-${String(index + 1).padStart(4, '0')}`,
        clienteNome: pedido.clienteNome || 'Cliente não informado',
        cepEntrega: pedido.cepEntrega || undefined,
        enderecoEntrega: pedido.enderecoEntrega || '',
        estado: pedido.estado || undefined,
        itens,
        total: this.getItemsTotal(itens),
        pagamentoConfirmado: pedido.pagamentoConfirmado ?? false,
        status: pedido.status || 'aberto',
        justificativaCancelamento: pedido.justificativaCancelamento || undefined,
      };
    });
  }

  private normalizeItems(items: ItemPedido[]): ItemPedido[] {
    return items.map((item) => ({
      ...item,
      precoUnitario: item.precoUnitario ?? 0,
      quantidade: Math.max(item.quantidade ?? 0, 0),
      subtotal: Math.max(item.quantidade ?? 0, 0) * (item.precoUnitario ?? 0),
    }));
  }

  private getItemsTotal(items: ItemPedido[]): number {
    return items.reduce((total, item) => total + item.subtotal, 0);
  }

  private sortByCreatedAt(pedidos: Pedido[]): Pedido[] {
    return [...pedidos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  protected override async loadFromApi(): Promise<void> {
    const pedidos = await lastValueFrom(this.api.listAll<Pedido>('/pedidos'));
    this.pedidos.set(this.sortByCreatedAt(this.normalizePedidos(mapApiList(pedidos))));
  }

  private mapPedido(pedido: Pedido): Pedido {
    return this.normalizePedidos([pedido])[0];
  }
}
