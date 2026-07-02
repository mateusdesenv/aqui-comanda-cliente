import { Injectable, computed, signal } from '@angular/core';
import { Comanda, ItemComanda, MapaMesaCard, Mesa, ResumoComandas } from '../models/app-data';
import { LocalStorageRepository } from './local-storage.repository';

@Injectable({ providedIn: 'root' })
export class ComandasService {
  private readonly repository = new LocalStorageRepository<Comanda[]>(
    'aqui-comanda:open-comandas',
    this.createDefaultComandas(),
  );

  readonly comandas = signal<Comanda[]>(this.normalizeComandas(this.repository.read()));
  readonly comandasAbertas = computed(() => this.comandas().filter((comanda) => comanda.status === 'aberta'));

  constructor() {
    this.persist();
  }

  getComandas(): Comanda[] {
    return this.comandasAbertas();
  }

  getOpenComandaForMesa(mesaId: string): Comanda | null {
    return this.comandasAbertas().find((comanda) => comanda.mesaId === mesaId) ?? null;
  }

  getItemsForMesa(mesa: Mesa): ItemComanda[] {
    return this.getOpenComandaForMesa(mesa.id)?.itens ?? [];
  }

  prepareComandaForMesa(mesa: Mesa): Comanda {
    const existingComanda = this.getOpenComandaForMesa(mesa.id);

    if (existingComanda) {
      return existingComanda;
    }

    const now = new Date().toISOString();
    const comanda: Comanda = {
      id: `comanda-${mesa.id}-${Date.now()}`,
      mesaId: mesa.id,
      status: 'aberta',
      itens: [],
      total: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.comandas.set([...this.comandas(), comanda]);
    this.persist();
    return comanda;
  }

  saveItemsForMesa(mesa: Mesa, items: ItemComanda[]): void {
    if (items.length === 0) {
      this.closeComandaForMesa(mesa.id);
      return;
    }

    const comanda = this.prepareComandaForMesa(mesa);
    const updatedItems = items.map((item) => ({
      ...item,
      subtotal: item.quantidade * item.precoUnitario,
    }));
    const total = this.getItemsTotal(updatedItems);
    const updatedAt = new Date().toISOString();

    this.comandas.set(
      this.comandas().map((currentComanda) =>
        currentComanda.id === comanda.id
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

  getCardForMesa(mesa: Mesa): MapaMesaCard {
    const comanda = this.getOpenComandaForMesa(mesa.id);
    const hasConsumo = Boolean(comanda && comanda.total > 0);

    return {
      mesa,
      status: mesa.status === 'inativa' ? 'inativa' : hasConsumo ? 'ocupada' : mesa.status,
      total: comanda?.total ?? 0,
    };
  }

  getCardsForMesas(mesas: Mesa[]): MapaMesaCard[] {
    return mesas.map((mesa) => this.getCardForMesa(mesa));
  }

  getResumoForMesas(mesas: Mesa[]): ResumoComandas {
    const cards = this.getCardsForMesas(mesas);
    const activeCards = cards.filter((card) => card.status !== 'inativa');

    return {
      livres: activeCards.filter((card) => card.status === 'livre' || card.status === 'reservada').length,
      ocupadas: activeCards.filter((card) => card.status === 'ocupada').length,
      totalEmConsumo: activeCards.reduce((total, card) => total + card.total, 0),
      totalMesas: activeCards.length,
    };
  }

  private persist(): void {
    this.repository.write(this.comandas());
  }

  private normalizeComandas(comandas: Comanda[]): Comanda[] {
    return comandas
      .filter((comanda) => Boolean(comanda.mesaId))
      .map((comanda) => {
        const itens = (comanda.itens ?? []).map((item) => ({
          ...item,
          precoUnitario: item.precoUnitario ?? 0,
          subtotal: item.subtotal ?? item.quantidade * (item.precoUnitario ?? 0),
        }));

        return {
          ...comanda,
          status: 'aberta',
          itens,
          total: this.getItemsTotal(itens),
        };
      });
  }

  private getItemsTotal(items: ItemComanda[]): number {
    return items.reduce((total, item) => total + item.subtotal, 0);
  }

  private createDefaultComandas(): Comanda[] {
    const now = new Date().toISOString();
    const itens: ItemComanda[] = [
      this.createItem('x-burger', 'X-Burger', 2, 24.9),
      this.createItem('batata-frita', 'Batata Frita', 1, 16.9),
      this.createItem('refrigerante-lata', 'Refrigerante Lata', 2, 7.5),
    ];

    return [
      {
        id: 'comanda-mesa-02',
        mesaId: 'mesa-02',
        status: 'aberta',
        itens,
        total: this.getItemsTotal(itens),
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  private createItem(
    productId: string,
    nome: string,
    quantidade: number,
    precoUnitario: number,
  ): ItemComanda {
    return {
      id: `${productId}-${quantidade}-${precoUnitario}`,
      productId,
      nome,
      quantidade,
      precoUnitario,
      subtotal: quantidade * precoUnitario,
    };
  }
}
