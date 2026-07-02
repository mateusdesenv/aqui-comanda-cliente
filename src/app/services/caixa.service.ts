import { Injectable, signal } from '@angular/core';
import { Comanda, EntradaCaixa, Mesa } from '../models/app-data';
import { LocalStorageRepository } from './local-storage.repository';

@Injectable({ providedIn: 'root' })
export class CaixaService {
  private readonly repository = new LocalStorageRepository<EntradaCaixa[]>(
    'aqui-comanda:caixa-entradas',
    [],
  );

  readonly entradas = signal<EntradaCaixa[]>(this.normalizeEntradas(this.repository.read()));

  constructor() {
    this.persist();
  }

  getEntradas(): EntradaCaixa[] {
    return this.entradas();
  }

  getTotalRecebido(entradas: EntradaCaixa[] = this.entradas()): number {
    return entradas.reduce((total, entrada) => total + entrada.valor, 0);
  }

  getEntradasHoje(entradas: EntradaCaixa[] = this.entradas()): EntradaCaixa[] {
    const todayKey = this.getDateKey(new Date());
    return entradas.filter((entrada) => this.getDateKey(new Date(entrada.criadaEm)) === todayKey);
  }

  hasEntradaForComanda(comandaId: string): boolean {
    return this.entradas().some((entrada) => entrada.tipo === 'comanda' && entrada.origemId === comandaId);
  }

  registrarEntradaComanda(comanda: Comanda, mesa?: Mesa | null): EntradaCaixa | null {
    if (!this.isComandaPaga(comanda)) {
      return null;
    }

    if (this.hasEntradaForComanda(comanda.id)) {
      return null;
    }

    const valor = comanda.totalFinalizado ?? comanda.total ?? 0;

    if (valor <= 0) {
      return null;
    }

    const now = new Date().toISOString();
    const mesaLabel = mesa ? `Mesa ${String(mesa.numero).padStart(2, '0')}` : '';
    const clienteLabel = comanda.clienteNome || 'Cliente não informado';

    const entrada: EntradaCaixa = {
      id: `entrada-comanda-${comanda.id}-${Date.now()}`,
      tipo: 'comanda',
      origemId: comanda.id,
      origemDescricao: mesa
        ? `Comanda ${this.getShortId(comanda.id)} - ${mesaLabel}`
        : `Comanda rápida - ${clienteLabel}`,
      clienteId: comanda.clienteId,
      clienteNome: clienteLabel,
      mesaId: comanda.mesaId ?? null,
      mesaNumero: mesa?.numero ?? null,
      valor,
      formaPagamento: 'Não informado',
      criadaEm: now,
      comandaFinalizadaEm: comanda.finalizadaEm ?? now,
    };

    this.entradas.set(this.sortEntradas([entrada, ...this.entradas()]));
    this.persist();
    return entrada;
  }

  private persist(): void {
    this.repository.write(this.entradas());
  }

  private normalizeEntradas(entradas: EntradaCaixa[]): EntradaCaixa[] {
    return this.sortEntradas(
      entradas
        .filter((entrada) => entrada.tipo === 'comanda' && entrada.origemId && Number(entrada.valor) > 0)
        .map((entrada) => ({
          ...entrada,
          id: entrada.id ?? `entrada-${entrada.origemId}`,
          tipo: 'comanda',
          origemDescricao: entrada.origemDescricao ?? `Comanda ${entrada.origemId}`,
          clienteNome: entrada.clienteNome ?? 'Cliente não informado',
          mesaId: entrada.mesaId ?? null,
          mesaNumero: entrada.mesaNumero ?? null,
          valor: Number(entrada.valor) || 0,
          formaPagamento: entrada.formaPagamento ?? 'Não informado',
          criadaEm: entrada.criadaEm ?? entrada.comandaFinalizadaEm ?? new Date().toISOString(),
        })),
    );
  }

  private sortEntradas(entradas: EntradaCaixa[]): EntradaCaixa[] {
    return [...entradas].sort(
      (first, second) => new Date(second.criadaEm).getTime() - new Date(first.criadaEm).getTime(),
    );
  }

  private isComandaPaga(comanda: Comanda): boolean {
    return comanda.status === 'finalizada' && comanda.paga;
  }

  private getDateKey(date: Date): string {
    return [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
  }

  private getShortId(id: string): string {
    const parts = id.split('-').filter(Boolean);
    return parts.slice(-2).join('-') || id;
  }
}
