import { Injectable, computed, signal } from '@angular/core';
import { Comanda, ItemComanda, MapaMesaCard, Mesa, ResumoComandas } from '../models/app-data';
import { LocalStorageRepository } from './local-storage.repository';

interface SaveComandaPayload {
  clienteId: string;
  clienteNome: string;
  items: ItemComanda[];
  mesaId?: string;
}

@Injectable({ providedIn: 'root' })
export class ComandasService {
  private readonly repository = new LocalStorageRepository<Comanda[]>(
    'aqui-comanda:open-comandas',
    [],
  );

  readonly comandas = signal<Comanda[]>(this.normalizeComandas(this.repository.read()));
  readonly comandasAbertas = computed(() => this.comandas().filter((comanda) => comanda.status === 'aberta'));
  readonly comandasAvulsas = computed(() =>
    this.comandasAbertas().filter((comanda) => !comanda.mesaId),
  );

  constructor() {
    this.persist();
  }

  getComandas(): Comanda[] {
    return this.comandasAbertas();
  }

  getQuickComandas(): Comanda[] {
    return this.comandasAvulsas();
  }

  getOpenComandasForMesa(mesaId: string): Comanda[] {
    return this.comandasAbertas().filter((comanda) => comanda.mesaId === mesaId);
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

    const comanda: Comanda = {
      id: `comanda-${mesaId ? `mesa-${mesaId}` : 'rapida'}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mesaId,
      clienteId: payload.clienteId,
      clienteNome: payload.clienteNome,
      tipo: mesaId ? 'mesa' : 'avulsa',
      status: 'aberta',
      itens: updatedItems,
      total: this.getItemsTotal(updatedItems),
      createdAt: now,
      updatedAt: now,
    };

    this.comandas.set([...this.comandas(), comanda]);
    this.persist();
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

    if (!existingComanda) {
      return null;
    }

    const mesaId = payload.mesaId || undefined;
    const updatedItems = this.normalizeItems(payload.items);
    const updatedComanda: Comanda = {
      ...existingComanda,
      mesaId,
      clienteId: payload.clienteId,
      clienteNome: payload.clienteNome,
      tipo: mesaId ? 'mesa' : 'avulsa',
      status: 'aberta',
      itens: updatedItems,
      total: this.getItemsTotal(updatedItems),
      updatedAt: new Date().toISOString(),
    };

    this.comandas.set(
      this.comandas().map((comanda) =>
        comanda.id === comandaId ? updatedComanda : comanda,
      ),
    );
    this.persist();
    return updatedComanda;
  }

  saveItemsForComanda(comandaId: string, items: ItemComanda[]): void {
    if (items.length === 0) {
      this.closeComandaById(comandaId);
      return;
    }

    const updatedItems = this.normalizeItems(items);
    const total = this.getItemsTotal(updatedItems);
    const updatedAt = new Date().toISOString();

    this.comandas.set(
      this.comandas().map((currentComanda) =>
        currentComanda.id === comandaId
          ? { ...currentComanda, itens: updatedItems, total, updatedAt }
          : currentComanda,
      ),
    );
    this.persist();
  }

  closeComandaForMesa(mesaId: string): void {
    this.comandas.set(this.comandas().filter((comanda) => comanda.mesaId !== mesaId));
    this.persist();
  }

  closeComandaById(comandaId: string): void {
    this.comandas.set(this.comandas().filter((comanda) => comanda.id !== comandaId));
    this.persist();
  }

  getCardForMesa(mesa: Mesa): MapaMesaCard {
    const comandas = this.getOpenComandasForMesa(mesa.id);
    const total = comandas.reduce((sum, comanda) => sum + comanda.total, 0);
    const hasComandas = comandas.length > 0;

    return {
      mesa,
      status: mesa.status === 'inativa' ? 'inativa' : hasComandas ? 'ocupada' : mesa.status,
      total,
      totalComandas: comandas.length,
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
      livres: activeCards.filter((card) => card.status === 'livre' || card.status === 'reservada').length,
      ocupadas: activeCards.filter((card) => card.status === 'ocupada').length,
      totalEmConsumo: activeCards.reduce((total, card) => total + card.total, 0) + totalAvulso,
      totalMesas: activeCards.length,
    };
  }

  private persist(): void {
    this.repository.write(this.comandas());
  }

  private normalizeComandas(comandas: Comanda[]): Comanda[] {
    return comandas
      .filter((comanda) => comanda.id !== 'comanda-mesa-02')
      .map((comanda) => {
        const itens = this.normalizeItems(comanda.itens ?? []);
        const mesaId = comanda.mesaId || undefined;

        return {
          ...comanda,
          mesaId,
          tipo: mesaId ? 'mesa' : 'avulsa',
          status: 'aberta',
          itens,
          total: this.getItemsTotal(itens),
        };
      });
  }

  private normalizeItems(items: ItemComanda[]): ItemComanda[] {
    return items.map((item) => ({
      ...item,
      precoUnitario: item.precoUnitario ?? 0,
      quantidade: item.quantidade ?? 0,
      subtotal: (item.quantidade ?? 0) * (item.precoUnitario ?? 0),
    }));
  }

  private getItemsTotal(items: ItemComanda[]): number {
    return items.reduce((total, item) => total + item.subtotal, 0);
  }
}
