import { Injectable, computed, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { Comanda, ItemComanda, MapaMesaCard, Mesa, ResumoComandas } from '../models/app-data';
import { CaixaService } from './caixa.service';
import { MesasService } from './mesas.service';
import { ProdutosService } from './produtos.service';

interface SaveComandaPayload {
  clienteId?: string;
  clienteNome: string;
  clienteManual?: boolean;
  items: ItemComanda[];
  mesaId?: string;
}

@Injectable({ providedIn: 'root' })
export class ComandasService {
  private readonly api = inject(ApiClientService);
  private readonly caixaService = inject(CaixaService);
  private readonly mesasService = inject(MesasService);
  private readonly produtosService = inject(ProdutosService);

  readonly comandas = signal<Comanda[]>([]);
  readonly comandasAbertas = computed(() =>
    this.comandas().filter((comanda) => this.isComandaAberta(comanda)),
  );
  readonly comandasFinalizadas = computed(() =>
    this.comandas().filter((comanda) => this.isComandaFinalizada(comanda)),
  );
  readonly comandasAvulsas = computed(() =>
    this.comandasAbertas().filter((comanda) => !comanda.mesaId),
  );

  constructor() {
    void this.reload().catch(() => undefined);
  }

  getComandas(): Comanda[] {
    return this.comandas();
  }

  clearData(): void {
    this.comandas.set([]);
  }

  getOpenComandas(): Comanda[] {
    return this.comandasAbertas();
  }

  getQuickComandas(): Comanda[] {
    return this.comandasAvulsas();
  }

  getComandasForMesa(mesaId: string): Comanda[] {
    return this.getComandasAtivasForMesa(mesaId).sort((first, second) => {
      const firstStatusWeight = this.isComandaAberta(first) ? 0 : 1;
      const secondStatusWeight = this.isComandaAberta(second) ? 0 : 1;

      if (firstStatusWeight !== secondStatusWeight) {
        return firstStatusWeight - secondStatusWeight;
      }

      return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
    });
  }

  getOpenComandasForMesa(mesaId: string): Comanda[] {
    return this.getComandasAtivasForMesa(mesaId).filter((comanda) => this.isComandaAberta(comanda));
  }

  getFinishedComandasForMesa(mesaId: string): Comanda[] {
    return this.getComandasAtivasForMesa(mesaId).filter((comanda) =>
      this.isComandaFinalizada(comanda),
    );
  }

  getComandasAtivasForMesa(mesaId: string): Comanda[] {
    return this.comandas().filter(
      (comanda) => comanda.mesaId === mesaId && !comanda.mesaLiberadaEm,
    );
  }

  canReleaseMesa(mesaId: string): boolean {
    const comandas = this.getComandasAtivasForMesa(mesaId);

    return comandas.length > 0 && comandas.every((comanda) => this.isComandaFinalizada(comanda));
  }

  releaseMesa(mesaId: string): boolean {
    if (!this.canReleaseMesa(mesaId)) {
      return false;
    }

    const releasedAt = new Date().toISOString();

    this.comandas.set(
      this.comandas().map((comanda) =>
        comanda.mesaId === mesaId && !comanda.mesaLiberadaEm
          ? { ...comanda, mesaLiberadaEm: releasedAt, updatedAt: releasedAt }
          : comanda,
      ),
    );
    void lastValueFrom(this.api.post(`/mesas/${mesaId}/liberar`, {})).then(async () => this.reload());
    return true;
  }

  getOpenComandaForMesa(mesaId: string): Comanda | null {
    return this.getOpenComandasForMesa(mesaId)[0] ?? null;
  }

  getItemsForMesa(mesa: Mesa): ItemComanda[] {
    return this.getOpenComandasForMesa(mesa.id).flatMap((comanda) => comanda.itens);
  }

  createComanda(payload: SaveComandaPayload): Comanda {
    const now = new Date().toISOString();
    const updatedItems = this.normalizeItems(payload.items);
    const mesaId = payload.mesaId || undefined;

    this.validateAndApplyStockDelta([], updatedItems);

    const comanda: Comanda = {
      id: `comanda-${mesaId ? `mesa-${mesaId}` : 'rapida'}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mesaId,
      mesaLiberadaEm: undefined,
      clienteId: payload.clienteId,
      clienteNome: payload.clienteNome,
      clienteManual: payload.clienteManual ?? !payload.clienteId,
      tipo: mesaId ? 'mesa' : 'avulsa',
      status: 'aberta',
      paga: false,
      itens: updatedItems,
      total: this.getItemsTotal(updatedItems),
      createdAt: now,
      updatedAt: now,
    };

    this.comandas.set([...this.comandas(), comanda]);
    void lastValueFrom(this.api.post<Comanda>('/comandas', payload)).then(async (created) => {
      this.comandas.set([...this.comandas().filter((item) => item.id !== comanda.id), this.mapComanda(created)]);
      await this.reloadDependents();
    });
    return comanda;
  }

  createQuickComanda(
    clienteId: string,
    clienteNome: string,
    items: ItemComanda[],
    mesaId?: string,
  ): Comanda {
    return this.createComanda({ clienteId, clienteNome, items, mesaId });
  }

  updateComanda(comandaId: string, payload: SaveComandaPayload): Comanda | null {
    const existingComanda = this.comandas().find((comanda) => comanda.id === comandaId);

    if (!existingComanda || !this.isComandaAberta(existingComanda)) {
      return null;
    }

    const mesaId = payload.mesaId || undefined;
    const updatedItems = this.normalizeItems(payload.items);

    this.validateAndApplyStockDelta(existingComanda.itens ?? [], updatedItems);

    const updatedComanda: Comanda = {
      ...existingComanda,
      mesaId,
      mesaLiberadaEm: undefined,
      clienteId: payload.clienteId,
      clienteNome: payload.clienteNome,
      clienteManual: payload.clienteManual ?? !payload.clienteId,
      tipo: mesaId ? 'mesa' : 'avulsa',
      status: 'aberta',
      paga: false,
      finalizadaEm: undefined,
      totalFinalizado: undefined,
      itens: updatedItems,
      total: this.getItemsTotal(updatedItems),
      updatedAt: new Date().toISOString(),
    };

    this.comandas.set(
      this.comandas().map((comanda) => (comanda.id === comandaId ? updatedComanda : comanda)),
    );
    void lastValueFrom(this.api.put<Comanda>(`/comandas/${comandaId}`, payload)).then(async (updated) => {
      this.comandas.set(this.comandas().map((comanda) => (comanda.id === comandaId ? this.mapComanda(updated) : comanda)));
      await this.reloadDependents();
    });
    return updatedComanda;
  }

  saveItemsForComanda(comandaId: string, items: ItemComanda[]): boolean {
    const existingComanda = this.comandas().find((comanda) => comanda.id === comandaId);

    if (!existingComanda || !this.isComandaAberta(existingComanda)) {
      return false;
    }

    if (items.length === 0) {
      this.removeOpenComandaById(comandaId);
      return true;
    }

    const updatedItems = this.normalizeItems(items);
    this.validateAndApplyStockDelta(existingComanda.itens ?? [], updatedItems);
    const total = this.getItemsTotal(updatedItems);
    const updatedAt = new Date().toISOString();

    this.comandas.set(
      this.comandas().map((currentComanda) =>
        currentComanda.id === comandaId
          ? { ...currentComanda, itens: updatedItems, total, updatedAt }
          : currentComanda,
      ),
    );
    void lastValueFrom(this.api.patch<Comanda>(`/comandas/${comandaId}/itens`, { items: updatedItems })).then(async (updated) => {
      this.comandas.set(this.comandas().map((comanda) => (comanda.id === comandaId ? this.mapComanda(updated) : comanda)));
      await this.reloadDependents();
    });
    return true;
  }

  finalizeComandaById(comandaId: string): Comanda | null {
    const existingComanda = this.comandas().find((comanda) => comanda.id === comandaId);

    if (!existingComanda || !this.isComandaAberta(existingComanda)) {
      return null;
    }

    if (!this.caixaService.hasCaixaAberto()) {
      return null;
    }

    const itens = this.normalizeItems(existingComanda.itens ?? []);

    if (itens.length === 0) {
      return null;
    }

    const now = new Date().toISOString();
    const totalFinalizado = this.getItemsTotal(itens);
    const finalizedComanda: Comanda = {
      ...existingComanda,
      status: 'finalizada',
      paga: true,
      finalizadaEm: now,
      totalFinalizado,
      itens,
      total: totalFinalizado,
      updatedAt: now,
    };

    this.comandas.set(
      this.comandas().map((comanda) => (comanda.id === comandaId ? finalizedComanda : comanda)),
    );
    void lastValueFrom(this.api.post<Comanda>(`/comandas/${comandaId}/finalizar`, {})).then(async (finalized) => {
      this.comandas.set(this.comandas().map((comanda) => (comanda.id === comandaId ? this.mapComanda(finalized) : comanda)));
      await this.reloadDependents();
    });
    return finalizedComanda;
  }

  closeComandaForMesa(mesaId: string): void {
    this.getOpenComandasForMesa(mesaId).forEach((comanda) => {
      this.finalizeComandaById(comanda.id);
    });
  }

  closeComandaById(comandaId: string): void {
    this.finalizeComandaById(comandaId);
  }

  removeOpenComandaById(comandaId: string): void {
    const existingComanda = this.comandas().find((comanda) => comanda.id === comandaId);

    if (!existingComanda || !this.isComandaAberta(existingComanda)) {
      return;
    }

    this.validateAndApplyStockDelta(existingComanda.itens ?? [], []);
    this.comandas.set(this.comandas().filter((comanda) => comanda.id !== comandaId));
    void lastValueFrom(this.api.delete(`/comandas/${comandaId}`)).then(async () => this.reloadDependents());
  }

  getCardForMesa(mesa: Mesa): MapaMesaCard {
    const comandasAtivasDaMesa = this.getComandasAtivasForMesa(mesa.id);
    const comandasAbertas = comandasAtivasDaMesa.filter((comanda) => this.isComandaAberta(comanda));
    const total = comandasAbertas.reduce((sum, comanda) => sum + comanda.total, 0);
    const hasComandasNoCicloAtual = comandasAtivasDaMesa.length > 0;
    const mesaLiberacaoPendente =
      hasComandasNoCicloAtual &&
      comandasAtivasDaMesa.every((comanda) => this.isComandaFinalizada(comanda));

    return {
      mesa,
      status:
        mesa.status === 'inativa' ? 'inativa' : hasComandasNoCicloAtual ? 'ocupada' : mesa.status,
      total,
      totalComandas: comandasAtivasDaMesa.length,
      mesaLiberacaoPendente,
    };
  }

  getCardsForMesas(mesas: Mesa[]): MapaMesaCard[] {
    return mesas.map((mesa) => this.getCardForMesa(mesa));
  }

  getResumoForMesas(mesas: Mesa[]): ResumoComandas {
    const cards = this.getCardsForMesas(mesas);
    const activeCards = cards.filter((card) => card.status !== 'inativa');
    const totalAvulso = this.comandasAvulsas().reduce((total, comanda) => total + comanda.total, 0);

    return {
      livres: activeCards.filter((card) => card.status === 'livre' || card.status === 'reservada')
        .length,
      ocupadas: activeCards.filter((card) => card.status === 'ocupada').length,
      totalEmConsumo: activeCards.reduce((total, card) => total + card.total, 0) + totalAvulso,
      totalMesas: activeCards.length,
    };
  }

  isComandaAberta(comanda: Comanda): boolean {
    return comanda.status === 'aberta' && !comanda.paga;
  }

  isComandaFinalizada(comanda: Comanda): boolean {
    return comanda.status === 'finalizada' || comanda.paga;
  }

  private normalizeComandas(comandas: Comanda[]): Comanda[] {
    return comandas
      .filter((comanda) => comanda.id !== 'comanda-mesa-02')
      .map((comanda) => {
        const apiComanda = mapApiEntity(comanda);
        const itens = this.normalizeItems(comanda.itens ?? []);
        const mesaId = comanda.mesaId || undefined;
        const rawStatus = String((comanda as Comanda & { status?: string }).status ?? 'aberta');
        const isFinalizada =
          rawStatus === 'finalizada' || rawStatus === 'fechada' || Boolean(comanda.paga);
        const total = this.getItemsTotal(itens);
        const status = isFinalizada ? 'finalizada' : 'aberta';

        return {
          ...apiComanda,
          mesaId,
          mesaLiberadaEm: comanda.mesaLiberadaEm,
          clienteManual: comanda.clienteManual ?? !comanda.clienteId,
          tipo: mesaId ? 'mesa' : 'avulsa',
          status,
          paga: isFinalizada,
          finalizadaEm: isFinalizada
            ? (comanda.finalizadaEm ?? comanda.updatedAt ?? new Date().toISOString())
            : undefined,
          totalFinalizado: isFinalizada ? (comanda.totalFinalizado ?? total) : undefined,
          itens,
          total: isFinalizada ? (comanda.totalFinalizado ?? total) : total,
        };
      });
  }

  private normalizeItems(items: ItemComanda[]): ItemComanda[] {
    return items.map((item) => {
      const produto = this.produtosService.getProdutoById(item.productId);
      const quantidade = Number(item.quantidade) || 0;
      const precoUnitario = Number(item.precoUnitario) || 0;
      const unitCost = Number(item.unitCost ?? produto?.costPrice) || 0;

      return {
        ...item,
        precoUnitario,
        quantidade,
        unitCost,
        totalCost: quantidade * unitCost,
        subtotal: quantidade * precoUnitario,
      };
    });
  }

  private getItemsTotal(items: ItemComanda[]): number {
    return items.reduce((total, item) => total + item.subtotal, 0);
  }

  private validateAndApplyStockDelta(previousItems: ItemComanda[], nextItems: ItemComanda[]): void {
    const previousQuantities = this.getQuantitiesByProduct(previousItems);
    const nextQuantities = this.getQuantitiesByProduct(nextItems);
    const deltas = new Map<string, number>();

    for (const productId of new Set([...previousQuantities.keys(), ...nextQuantities.keys()])) {
      const previousQuantity = previousQuantities.get(productId) ?? 0;
      const nextQuantity = nextQuantities.get(productId) ?? 0;
      const reserveDelta = nextQuantity - previousQuantity;

      if (reserveDelta === 0) {
        continue;
      }

      const produto = this.produtosService.getProdutoById(productId);

      if (!produto) {
        throw new Error('Produto não encontrado no cadastro.');
      }

      if (reserveDelta > 0 && !this.produtosService.productControlsStock(produto)) {
        if (!this.produtosService.isProductAvailable(produto)) {
          throw new Error(this.produtosService.getProductUnavailableMessage(produto));
        }

        continue;
      }

      if (reserveDelta > 0 && !this.produtosService.isProductAvailable(produto)) {
        throw new Error(this.produtosService.getProductUnavailableMessage(produto));
      }

      if (reserveDelta > 0 && produto.stockQuantity < reserveDelta) {
        throw new Error(
          produto.stockQuantity <= 0
            ? 'Produto sem estoque disponível.'
            : 'Quantidade solicitada maior que o estoque disponível.',
        );
      }

      deltas.set(productId, -reserveDelta);
    }

    this.produtosService.applyStockDeltas(deltas);
  }

  private getQuantitiesByProduct(items: ItemComanda[]): Map<string, number> {
    const quantities = new Map<string, number>();

    for (const item of items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + (Number(item.quantidade) || 0));
    }

    return quantities;
  }

  async reload(): Promise<void> {
    const comandas = await lastValueFrom(this.api.listAll<Comanda>('/comandas'));
    this.comandas.set(this.normalizeComandas(mapApiList(comandas)));
  }

  private mapComanda(comanda: Comanda): Comanda {
    return this.normalizeComandas([comanda])[0];
  }

  private async reloadDependents(): Promise<void> {
    await Promise.all([
      this.reload(),
      this.produtosService.reload(),
      this.caixaService.reload(),
    ]);
  }
}
