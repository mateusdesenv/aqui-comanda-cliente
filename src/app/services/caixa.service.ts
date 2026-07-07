import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { Colaborador, Comanda, EntradaCaixa, Mesa, SessaoCaixa } from '../models/app-data';

@Injectable({ providedIn: 'root' })
export class CaixaService {
  private readonly api = inject(ApiClientService);

  readonly entradas = signal<EntradaCaixa[]>([]);
  readonly sessoes = signal<SessaoCaixa[]>([]);

  constructor() {
    void this.reload().catch(() => undefined);
  }

  getEntradas(): EntradaCaixa[] {
    return this.entradas();
  }

  getSessoes(): SessaoCaixa[] {
    return this.sessoes();
  }

  clearData(): void {
    this.entradas.set([]);
    this.sessoes.set([]);
  }

  getSessaoAberta(): SessaoCaixa | null {
    return this.sessoes().find((sessao) => sessao.status === 'aberto') ?? null;
  }

  hasCaixaAberto(): boolean {
    return Boolean(this.getSessaoAberta());
  }

  abrirCaixa(observacaoAbertura = '', usuario?: Colaborador | null): SessaoCaixa | null {
    if (this.hasCaixaAberto()) {
      return null;
    }

    const now = new Date().toISOString();
    const sessao: SessaoCaixa = {
      id: `caixa-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      status: 'aberto',
      abertoEm: now,
      abertoPorId: usuario?.id,
      abertoPorNome: usuario?.nome,
      observacaoAbertura: observacaoAbertura.trim() || undefined,
      totalEntradas: 0,
      quantidadeEntradas: 0,
    };

    this.sessoes.set([sessao, ...this.sessoes()]);
    void lastValueFrom(this.api.post<SessaoCaixa>('/caixa/sessoes/abrir', { observacaoAbertura })).then(async () => this.reload());
    return sessao;
  }

  fecharCaixa(observacaoFechamento = '', usuario?: Colaborador | null): SessaoCaixa | null {
    const sessaoAberta = this.getSessaoAberta();

    if (!sessaoAberta) {
      return null;
    }

    const now = new Date().toISOString();
    const entradasDaSessao = this.getEntradasBySessao(sessaoAberta.id);
    const totalEntradas = this.getTotalRecebido(entradasDaSessao);
    const sessaoFechada: SessaoCaixa = {
      ...sessaoAberta,
      status: 'fechado',
      fechadoEm: now,
      fechadoPorId: usuario?.id,
      fechadoPorNome: usuario?.nome,
      observacaoFechamento: observacaoFechamento.trim() || undefined,
      totalEntradas,
      quantidadeEntradas: entradasDaSessao.length,
    };

    this.sessoes.set(
      this.sessoes().map((sessao) => (sessao.id === sessaoAberta.id ? sessaoFechada : sessao)),
    );
    void lastValueFrom(this.api.post<SessaoCaixa>(`/caixa/sessoes/${sessaoAberta.id}/fechar`, { observacaoFechamento })).then(async () => this.reload());
    return sessaoFechada;
  }

  getEntradasBySessao(sessaoId: string): EntradaCaixa[] {
    return this.entradas().filter((entrada) => entrada.sessaoCaixaId === sessaoId);
  }

  getTotalRecebido(entradas: EntradaCaixa[] = this.entradas()): number {
    return entradas.reduce((total, entrada) => total + entrada.valor, 0);
  }

  getEntradasHoje(entradas: EntradaCaixa[] = this.entradas()): EntradaCaixa[] {
    const todayKey = this.getDateKey(new Date());
    return entradas.filter((entrada) => this.getDateKey(new Date(entrada.criadaEm)) === todayKey);
  }

  getEntradasPorFormaPagamento(entradas: EntradaCaixa[] = this.entradas()): Array<{ forma: string; total: number; quantidade: number }> {
    const grouped = new Map<string, { forma: string; total: number; quantidade: number }>();

    entradas.forEach((entrada) => {
      const forma = entrada.formaPagamento || 'Não informado';
      const current = grouped.get(forma) ?? { forma, total: 0, quantidade: 0 };
      grouped.set(forma, {
        forma,
        total: current.total + entrada.valor,
        quantidade: current.quantidade + 1,
      });
    });

    return [...grouped.values()].sort((a, b) => b.total - a.total);
  }

  hasEntradaForComanda(comandaId: string): boolean {
    return this.entradas().some((entrada) => entrada.tipo === 'comanda' && entrada.origemId === comandaId);
  }

  registrarEntradaComanda(comanda: Comanda, mesa?: Mesa | null): EntradaCaixa | null {
    const sessaoAberta = this.getSessaoAberta();

    if (!sessaoAberta) {
      return null;
    }

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
      sessaoCaixaId: sessaoAberta.id,
      criadaEm: now,
      comandaFinalizadaEm: comanda.finalizadaEm ?? now,
    };

    void this.reload();
    return entrada;
  }

  private recalcularSessaoAberta(): void {
    const sessaoAberta = this.getSessaoAberta();

    if (!sessaoAberta) {
      return;
    }

    const entradasDaSessao = this.getEntradasBySessao(sessaoAberta.id);
    const updatedSessao: SessaoCaixa = {
      ...sessaoAberta,
      totalEntradas: this.getTotalRecebido(entradasDaSessao),
      quantidadeEntradas: entradasDaSessao.length,
    };

    this.sessoes.set(
      this.sessoes().map((sessao) => (sessao.id === sessaoAberta.id ? updatedSessao : sessao)),
    );
  }

  private normalizeEntradas(entradas: EntradaCaixa[]): EntradaCaixa[] {
    return this.sortEntradas(
      entradas
        .filter((entrada) => entrada.tipo === 'comanda' && entrada.origemId && Number(entrada.valor) > 0)
        .map((entrada) => ({
          ...mapApiEntity(entrada),
          id: entrada.id ?? (entrada as EntradaCaixa & { _id?: string })._id ?? `entrada-${entrada.origemId}`,
          tipo: 'comanda',
          origemDescricao: entrada.origemDescricao ?? `Comanda ${entrada.origemId}`,
          clienteNome: entrada.clienteNome ?? 'Cliente não informado',
          mesaId: entrada.mesaId ?? null,
          mesaNumero: entrada.mesaNumero ?? null,
          valor: Number(entrada.valor) || 0,
          formaPagamento: entrada.formaPagamento ?? 'Não informado',
          sessaoCaixaId: entrada.sessaoCaixaId,
          criadaEm: entrada.criadaEm ?? entrada.comandaFinalizadaEm ?? new Date().toISOString(),
        })),
    );
  }

  private normalizeSessoes(sessoes: SessaoCaixa[]): SessaoCaixa[] {
    const normalized = sessoes
      .filter((sessao) => sessao.id && sessao.abertoEm)
      .map((sessao) => {
        const entradasDaSessao = this.entradas().filter((entrada) => entrada.sessaoCaixaId === sessao.id);
        const isAberto = sessao.status === 'aberto';

        return {
          ...sessao,
          status: isAberto ? 'aberto' : 'fechado',
          totalEntradas: isAberto
            ? this.getTotalRecebido(entradasDaSessao)
            : Number(sessao.totalEntradas) || this.getTotalRecebido(entradasDaSessao),
          quantidadeEntradas: isAberto
            ? entradasDaSessao.length
            : Number(sessao.quantidadeEntradas) || entradasDaSessao.length,
        } as SessaoCaixa;
      })
      .sort((a, b) => new Date(b.abertoEm).getTime() - new Date(a.abertoEm).getTime());

    let foundOpen = false;
    return normalized.map((sessao) => {
      if (sessao.status !== 'aberto') {
        return sessao;
      }

      if (!foundOpen) {
        foundOpen = true;
        return sessao;
      }

      return {
        ...sessao,
        status: 'fechado',
        fechadoEm: sessao.fechadoEm ?? new Date().toISOString(),
      };
    });
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

  async reload(): Promise<void> {
    const [sessoes, entradas] = await Promise.all([
      lastValueFrom(this.api.listAll<SessaoCaixa>('/caixa/sessoes')),
      lastValueFrom(this.api.listAll<EntradaCaixa>('/caixa/entradas')),
    ]);
    this.entradas.set(this.normalizeEntradas(mapApiList(entradas)));
    this.sessoes.set(this.normalizeSessoes(mapApiList(sessoes)));
  }
}
