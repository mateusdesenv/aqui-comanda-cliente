import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClientService } from '../core/api/api-client.service';
import { ApiBackedState } from '../core/api/api-backed-state';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { Colaborador, EntradaCaixa, SessaoCaixa } from '../models/app-data';

@Injectable({ providedIn: 'root' })
export class CaixaService extends ApiBackedState {
  private readonly api = inject(ApiClientService);

  readonly entradas = signal<EntradaCaixa[]>([]);
  readonly sessoes = signal<SessaoCaixa[]>([]);


  getEntradas(): EntradaCaixa[] {
    return this.entradas();
  }

  getSessoes(): SessaoCaixa[] {
    return this.sessoes();
  }

  clearData(): void {
    super.clearLoadState();
    this.entradas.set([]);
    this.sessoes.set([]);
  }

  getSessaoAberta(): SessaoCaixa | null {
    return this.sessoes().find((sessao) => sessao.status === 'aberto') ?? null;
  }

  hasCaixaAberto(): boolean {
    return Boolean(this.getSessaoAberta());
  }

  async abrirCaixa(observacaoAbertura = '', usuario?: Colaborador | null): Promise<SessaoCaixa | null> {
    if (this.hasCaixaAberto()) {
      return null;
    }

    const sessao = mapApiEntity(await lastValueFrom(this.api.post<SessaoCaixa>('/caixa/sessoes/abrir', { observacaoAbertura })));
    this.sessoes.set(this.normalizeSessoes([sessao, ...this.sessoes()]));
    await this.reload();
    return sessao;
  }

  async fecharCaixa(observacaoFechamento = '', usuario?: Colaborador | null): Promise<SessaoCaixa | null> {
    const sessaoAberta = this.getSessaoAberta();

    if (!sessaoAberta) {
      return null;
    }

    const sessaoFechada = mapApiEntity(await lastValueFrom(this.api.post<SessaoCaixa>(`/caixa/sessoes/${sessaoAberta.id}/fechar`, { observacaoFechamento })));
    this.sessoes.set(this.normalizeSessoes(this.sessoes().map((sessao) => (sessao.id === sessaoAberta.id ? sessaoFechada : sessao))));
    await this.reload();
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

  private getDateKey(date: Date): string {
    return [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
  }

  protected override async loadFromApi(): Promise<void> {
    const [sessoes, entradas] = await Promise.all([
      lastValueFrom(this.api.listAll<SessaoCaixa>('/caixa/sessoes')),
      lastValueFrom(this.api.listAll<EntradaCaixa>('/caixa/entradas')),
    ]);
    this.entradas.set(this.normalizeEntradas(mapApiList(entradas)));
    this.sessoes.set(this.normalizeSessoes(mapApiList(sessoes)));
  }
}
