import { Injectable, computed, inject, signal } from '@angular/core';
import { Comanda, ItemComanda, MapaMesaCard, Mesa, ResumoComandas } from '../models/app-data';
import { CaixaService } from './caixa.service';
import { LocalStorageRepository } from './local-storage.repository';
import { MesasService } from './mesas.service';

interface SaveComandaPayload {
  clienteId?: string;
  clienteNome: string;
  clienteManual?: boolean;
  items: ItemComanda[];
  mesaId?: string;
}

@Injectable({ providedIn: 'root' })
export class ComandasService {
  private readonly caixaService = inject(CaixaService);
  private readonly mesasService = inject(MesasService);

  private readonly repository = new LocalStorageRepository<Comanda[]>(
    'aqui-comanda:open-comandas',
    [],
  );

  readonly comandas = signal<Comanda[]>(this.normalizeComandas(this.repository.read()));
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
    this.persist();
  }

  getComandas(): Comanda[] {
    return this.comandas();
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
    this.persist();
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

    if (!existingComanda || !this.isComandaAberta(existingComanda)) {
      return null;
    }

    const mesaId = payload.mesaId || undefined;
    const updatedItems = this.normalizeItems(payload.items);
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
    this.persist();
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
    return true;
  }

  finalizeComandaById(comandaId: string): Comanda | null {
    const existingComanda = this.comandas().find((comanda) => comanda.id === comandaId);

    if (!existingComanda || !this.isComandaAberta(existingComanda)) {
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
    this.persist();

    const mesa = finalizedComanda.mesaId
      ? (this.mesasService
          .getMesas()
          .find((currentMesa) => currentMesa.id === finalizedComanda.mesaId) ?? null)
      : null;

    this.caixaService.registrarEntradaComanda(finalizedComanda, mesa);
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

    this.comandas.set(this.comandas().filter((comanda) => comanda.id !== comandaId));
    this.persist();
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

  private persist(): void {
    this.repository.write(this.comandas());
  }

  private normalizeComandas(comandas: Comanda[]): Comanda[] {
    return comandas
      .filter((comanda) => comanda.id !== 'comanda-mesa-02')
      .map((comanda) => {
        const itens = this.normalizeItems(comanda.itens ?? []);
        const mesaId = comanda.mesaId || undefined;
        const rawStatus = String((comanda as Comanda & { status?: string }).status ?? 'aberta');
        const isFinalizada =
          rawStatus === 'finalizada' || rawStatus === 'fechada' || Boolean(comanda.paga);
        const total = this.getItemsTotal(itens);
        const status = isFinalizada ? 'finalizada' : 'aberta';

        return {
          ...comanda,
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
