import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationModalComponent } from '../components/confirmation-modal.component';
import { Colaborador, Filial } from '../models/app-data';
import { AuthService } from '../services/auth.service';
import { CepService } from '../services/cep.service';
import { ColaboradoresService } from '../services/colaboradores.service';
import { FilialPayload, FiliaisService } from '../services/filiais.service';

interface FilialFormModel {
  nome: string;
  descricao: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  colaboradoresIds: string[];
  ativa: boolean;
}

@Component({
  selector: 'app-filiais-page',
  standalone: true,
  imports: [FormsModule, ConfirmationModalComponent],
  template: `
    <div class="page-stack management-page filiais-page">
      <section class="page-head">
        <div>
          <h1>Lojas / Filiais</h1>
          <p>{{ hasFilialCadastrada ? 'Cadastre unidades do estabelecimento e associe os colaboradores que trabalham em cada filial.' : 'Cadastre sua primeira filial para começar a operar o sistema.' }}</p>
        </div>
      </section>

      @if (errorMessage && !filialModalOpen) {
        <div class="form-feedback">{{ errorMessage }}</div>
      }

      @if (successMessage && !filialModalOpen) {
        <div class="form-feedback success setup-success-feedback">
          <span>{{ successMessage }}</span>
          @if (hasFilialCadastrada) {
            <button class="ghost-button" type="button" (click)="goToMapa()">Ir para o mapa de comandas</button>
          }
        </div>
      }

      @if (!hasFilialCadastrada) {
        <section class="settings-card branch-info-card setup-required-card">
          <div>
            <strong>Cadastre sua primeira filial para começar a usar o sistema</strong>
            @if (canWriteConfiguracoes) {
              <p>Antes de abrir comandas, lançar pedidos ou movimentar o caixa, configure pelo menos uma filial ativa do estabelecimento.</p>
            } @else {
              <p>Nenhuma filial cadastrada. Solicite a um administrador para configurar a primeira filial do estabelecimento.</p>
            }
          </div>
          @if (canWriteConfiguracoes) {
            <button class="primary-action-button" type="button" (click)="openCreateModal()">Nova filial</button>
          }
        </section>
      }

      <section class="settings-card branch-info-card">
        <div>
          <strong>Produtos e colaboradores são globais</strong>
          <p>O cardápio continua compartilhado entre todas as filiais. Colaboradores são cadastrados uma única vez e associados às unidades onde trabalham.</p>
        </div>
      </section>

      <section class="management-list-card full-management-list">
        <div class="list-card-head">
          <div>
            <h2>Filiais cadastradas</h2>
            <span>{{ filiais.length }} filiais no sistema</span>
          </div>
        </div>

        <div class="branches-grid">
          @for (filial of filiais; track filial.id) {
            <article class="branch-card">
              <header class="branch-card-header">
                <div>
                  <span class="status-chip" [class.inativa]="!filial.ativa">
                    {{ filial.ativa ? 'Ativa' : 'Inativa' }}
                  </span>
                  <h3>{{ filial.nome }}</h3>
                  <p>{{ filial.descricao || 'Sem descrição cadastrada.' }}</p>
                </div>

                <div class="row-actions client-more-actions" (click)="$event.stopPropagation()">
                  @if (canWriteConfiguracoes) {
                    <button
                      class="more-actions-button"
                      type="button"
                      [attr.aria-label]="'Abrir ações de ' + filial.nome"
                      [attr.aria-expanded]="openedActionMenuFilialId === filial.id"
                      (click)="toggleFilialActions(filial.id, $event)"
                    >
                      ⋮
                    </button>

                    @if (openedActionMenuFilialId === filial.id) {
                      <div class="row-actions-popup" role="menu">
                        <button type="button" role="menuitem" (click)="handleEditFilial(filial)">
                          Editar
                        </button>
                        <button type="button" role="menuitem" (click)="handleToggleFilial(filial)">
                          {{ filial.ativa ? 'Inativar' : 'Ativar' }}
                        </button>
                        <button class="danger" type="button" role="menuitem" (click)="handleDeleteFilial(filial)">
                          Excluir
                        </button>
                      </div>
                    }
                  } @else {
                    <span class="readonly-chip">Somente leitura</span>
                  }
                </div>
              </header>

              <div class="branch-card-body">
                <div>
                  <span>Endereço</span>
                  <strong>{{ formatEndereco(filial) }}</strong>
                </div>

                <div>
                  <span>Colaboradores associados</span>
                  <strong>{{ filial.colaboradoresIds.length }} colaboradores</strong>
                  <small>{{ getColaboradoresResumo(filial) }}</small>
                </div>

                <div>
                  <span>Criada em</span>
                  <strong>{{ formatDate(filial.criadaEm) }}</strong>
                </div>
              </div>
            </article>
          } @empty {
            <div class="management-empty-state branches-empty-state">
              <strong>{{ hasFilialCadastrada ? 'Nenhuma filial cadastrada ainda.' : 'Cadastre sua primeira filial' }}</strong>
              <span>{{ canWriteConfiguracoes ? 'Para começar a operar o Aqui Comanda, cadastre pelo menos uma filial ativa do seu estabelecimento.' : 'Nenhuma filial cadastrada. Solicite a um administrador para configurar a primeira filial do estabelecimento.' }}</span>
              @if (canWriteConfiguracoes) {
                <button class="primary-action-button" type="button" (click)="openCreateModal()">Nova filial</button>
              }
            </div>
          }
        </div>
      </section>

      @if (canWriteConfiguracoes) {
        <button
          class="floating-comanda-button floating-management-button"
          type="button"
          aria-label="Nova filial"
          (click)="openCreateModal()"
        >
          <span aria-hidden="true">+</span>
          <span>Nova filial</span>
        </button>
      }

      @if (filialModalOpen) {
        <div class="comanda-modal-overlay" role="presentation">
          <section class="management-modal-card branch-modal-card" role="dialog" aria-modal="true" aria-labelledby="filial-modal-title">
            <button class="modal-close-button" type="button" aria-label="Fechar modal de filial" (click)="closeModal()">
              X
            </button>

            <header class="management-modal-header">
              <h2 id="filial-modal-title">{{ editingFilialId ? 'Editar filial' : 'Nova filial' }}</h2>
              <p>{{ editingFilialId ? 'Atualize os dados e colaboradores vinculados a esta unidade.' : 'Cadastre uma nova unidade do estabelecimento.' }}</p>
            </header>

            <form class="management-form-card modal-management-form branch-form" (ngSubmit)="saveFilial()">
              <section class="branch-form-section">
                <h3>Dados principais</h3>
                <label>
                  Nome/Título da filial
                  <input type="text" name="nome" required placeholder="Ex.: Matriz, Filial Centro" [(ngModel)]="form.nome" />
                </label>

                <label>
                  Descrição <span class="optional-label">opcional</span>
                  <textarea name="descricao" rows="3" placeholder="Ex.: Unidade principal, loja física, delivery..." [(ngModel)]="form.descricao"></textarea>
                </label>

                <label class="toggle-field">
                  <input type="checkbox" name="ativa" [(ngModel)]="form.ativa" />
                  Filial ativa
                </label>
              </section>

              <section class="branch-form-section">
                <h3>Endereço completo</h3>
                <div class="branch-address-grid">
                  <label class="span-2">
                    Rua / Avenida
                    <input type="text" name="rua" required placeholder="Ex.: Avenida Brasil" [(ngModel)]="form.rua" />
                  </label>

                  <label>
                    Número
                    <input type="text" name="numero" required placeholder="Ex.: 120" [(ngModel)]="form.numero" />
                  </label>

                  <label>
                    Complemento <span class="optional-label">opcional</span>
                    <input type="text" name="complemento" placeholder="Ex.: Sala 02" [(ngModel)]="form.complemento" />
                  </label>

                  <label>
                    Bairro
                    <input type="text" name="bairro" required placeholder="Ex.: Centro" [(ngModel)]="form.bairro" />
                  </label>

                  <label>
                    Cidade
                    <input type="text" name="cidade" required placeholder="Ex.: Criciúma" [(ngModel)]="form.cidade" />
                  </label>

                  <label>
                    Estado
                    <input type="text" name="estado" maxlength="2" required placeholder="SC" [ngModel]="form.estado" (ngModelChange)="form.estado = $event.toUpperCase()" />
                  </label>

                  <label>
                    CEP <span class="optional-label">opcional</span>
                    <input
                      type="text"
                      name="cep"
                      inputmode="numeric"
                      maxlength="9"
                      placeholder="00000-000"
                      [ngModel]="form.cep"
                      (ngModelChange)="onFilialCepChange($event)"
                    />
                  </label>
                </div>

                @if (cepFeedback) {
                  <div class="cep-inline-feedback" [class.error]="cepFeedbackType === 'error'">{{ cepFeedback }}</div>
                }
              </section>

              <section class="branch-form-section">
                <div class="branch-section-head">
                  <div>
                    <h3>Colaboradores da filial</h3>
                    <p>Selecione os colaboradores que trabalham nesta unidade.</p>
                  </div>
                  <span class="settings-current-badge">{{ form.colaboradoresIds.length }} selecionados</span>
                </div>

                <div class="branch-collaborators-list">
                  @for (colaborador of colaboradores; track colaborador.id) {
                    <label class="branch-collaborator-option" [class.selected]="isColaboradorSelected(colaborador.id)" [class.inactive]="!colaborador.ativo">
                      <input
                        type="checkbox"
                        [checked]="isColaboradorSelected(colaborador.id)"
                        (change)="toggleColaborador(colaborador.id, $any($event.target).checked)"
                      />
                      <span>
                        <strong>{{ colaborador.nome }}</strong>
                        <small>{{ colaborador.nivel === 'admin' ? 'Administrador' : 'Colaborador' }} · {{ colaborador.ativo ? 'Ativo' : 'Inativo' }}</small>
                      </span>
                    </label>
                  } @empty {
                    <div class="branch-no-collaborators">
                      Nenhum colaborador cadastrado ainda. Cadastre colaboradores na tela Colaboradores para associá-los às filiais.
                    </div>
                  }
                </div>
              </section>

              @if (errorMessage) {
                <div class="form-feedback">{{ errorMessage }}</div>
              }

              @if (successMessage && filialModalOpen) {
                <div class="form-feedback success">{{ successMessage }}</div>
              }

              <div class="form-actions">
                <button class="primary-action-button" type="submit" [disabled]="!canWriteConfiguracoes">
                  {{ editingFilialId ? 'Salvar alterações' : 'Cadastrar filial' }}
                </button>
                <button class="ghost-button" type="button" (click)="closeModal()">Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      }

      @if (deleteCandidate) {
        <app-confirmation-modal
          title="Excluir filial?"
          [description]="'A filial ' + deleteCandidate.nome + ' será removida da listagem. Essa ação não altera colaboradores nem produtos globais.'"
          confirmLabel="Excluir filial"
          cancelLabel="Cancelar"
          [danger]="true"
          (confirm)="confirmDeleteFilial()"
          (cancel)="cancelDeleteFilial()"
        />
      }
    </div>
  `,
})
export class FiliaisPageComponent {
  private readonly filiaisService = inject(FiliaisService);
  private readonly colaboradoresService = inject(ColaboradoresService);
  private readonly authService = inject(AuthService);
  private readonly cepService = inject(CepService);
  private readonly router = inject(Router);

  protected filiais = this.filiaisService.getFiliais();
  protected colaboradores = this.colaboradoresService.getColaboradores();
  protected filialModalOpen = false;
  protected editingFilialId: string | null = null;
  protected openedActionMenuFilialId: string | null = null;
  protected deleteCandidate: Filial | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  protected cepFeedback = '';
  protected cepFeedbackType: 'success' | 'error' | 'loading' = 'success';
  protected form: FilialFormModel = this.createEmptyForm();

  protected get canWriteConfiguracoes(): boolean {
    return this.authService.canWrite('configuracoes');
  }

  protected get hasFilialCadastrada(): boolean {
    return this.filiaisService.hasFilialCadastrada();
  }

  @HostListener('document:click')
  protected closeActionMenus(): void {
    this.openedActionMenuFilialId = null;
  }

  protected openCreateModal(): void {
    if (!this.canWriteConfiguracoes) {
      this.errorMessage = 'Você não tem permissão de escrita em Configurações.';
      return;
    }

    this.editingFilialId = null;
    this.openedActionMenuFilialId = null;
    this.form = this.createEmptyForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.cepFeedback = '';
    this.filialModalOpen = true;
  }

  protected async onFilialCepChange(value: string): Promise<void> {
    this.form.cep = this.cepService.formatCep(value);
    this.cepFeedback = '';

    if (!this.cepService.isCepComplete(this.form.cep)) {
      return;
    }

    this.cepFeedbackType = 'loading';
    this.cepFeedback = 'Buscando endereço...';

    try {
      const endereco = await this.cepService.buscarCep(this.form.cep);
      this.form.cep = endereco.cep;
      this.form.rua = endereco.rua || this.form.rua;
      this.form.bairro = endereco.bairro || this.form.bairro;
      this.form.cidade = endereco.cidade || this.form.cidade;
      this.form.estado = endereco.estado || this.form.estado;

      if (endereco.complemento && !this.form.complemento.trim()) {
        this.form.complemento = endereco.complemento;
      }

      this.cepFeedbackType = 'success';
      this.cepFeedback = 'Endereço preenchido pelo CEP. Você pode editar os dados se precisar.';
    } catch (error) {
      this.cepFeedbackType = 'error';
      this.cepFeedback = error instanceof Error ? error.message : 'Não foi possível buscar o endereço agora.';
    }
  }

  protected closeModal(): void {
    this.filialModalOpen = false;
    this.editingFilialId = null;
    this.form = this.createEmptyForm();
    this.errorMessage = '';
    this.cepFeedback = '';
  }

  protected handleEditFilial(filial: Filial): void {
    if (!this.canWriteConfiguracoes) {
      this.errorMessage = 'Você não tem permissão de escrita em Configurações.';
      return;
    }

    this.openedActionMenuFilialId = null;
    this.editingFilialId = filial.id;
    this.form = {
      nome: filial.nome,
      descricao: filial.descricao ?? '',
      rua: filial.endereco.rua,
      numero: filial.endereco.numero,
      complemento: filial.endereco.complemento ?? '',
      bairro: filial.endereco.bairro,
      cidade: filial.endereco.cidade,
      estado: filial.endereco.estado,
      cep: this.cepService.formatCep(filial.endereco.cep ?? ''),
      colaboradoresIds: [...filial.colaboradoresIds],
      ativa: filial.ativa,
    };
    this.errorMessage = '';
    this.successMessage = '';
    this.cepFeedback = '';
    this.filialModalOpen = true;
  }

  protected saveFilial(): void {
    if (!this.canWriteConfiguracoes) {
      this.errorMessage = 'Você não tem permissão de escrita em Configurações.';
      return;
    }

    const validationError = this.validateForm();

    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    const payload: FilialPayload = {
      nome: this.form.nome.trim(),
      descricao: this.form.descricao.trim() || undefined,
      endereco: {
        rua: this.form.rua.trim(),
        numero: this.form.numero.trim(),
        complemento: this.form.complemento.trim() || undefined,
        bairro: this.form.bairro.trim(),
        cidade: this.form.cidade.trim(),
        estado: this.form.estado.trim().toUpperCase(),
        cep: this.cepService.formatCep(this.form.cep).trim() || undefined,
      },
      colaboradoresIds: [...this.form.colaboradoresIds],
      ativa: this.form.ativa,
    };

    const setupWasBlocked = !this.filiaisService.hasFilialCadastrada();

    if (this.editingFilialId) {
      this.filiaisService.updateFilial(this.editingFilialId, payload);
      this.successMessage = setupWasBlocked && payload.ativa
        ? 'Filial ativada com sucesso. Agora você já pode operar o sistema.'
        : 'Filial atualizada com sucesso.';
    } else {
      this.filiaisService.createFilial(payload);
      this.successMessage = setupWasBlocked && payload.ativa
        ? 'Filial cadastrada com sucesso. Agora você já pode operar o sistema.'
        : 'Filial cadastrada com sucesso.';
    }

    this.refreshFiliais();
    this.filialModalOpen = false;
    this.editingFilialId = null;
    this.form = this.createEmptyForm();
    this.errorMessage = '';
  }

  protected handleToggleFilial(filial: Filial): void {
    if (!this.canWriteConfiguracoes) {
      this.errorMessage = 'Você não tem permissão de escrita em Configurações.';
      return;
    }

    this.filiaisService.toggleAtiva(filial.id);
    this.refreshFiliais();
    this.openedActionMenuFilialId = null;
    this.successMessage = filial.ativa ? 'Filial inativada com sucesso.' : 'Filial ativada com sucesso.';
  }

  protected handleDeleteFilial(filial: Filial): void {
    if (!this.canWriteConfiguracoes) {
      this.errorMessage = 'Você não tem permissão de escrita em Configurações.';
      return;
    }

    this.openedActionMenuFilialId = null;
    this.deleteCandidate = filial;
  }

  protected cancelDeleteFilial(): void {
    this.deleteCandidate = null;
  }

  protected confirmDeleteFilial(): void {
    if (!this.canWriteConfiguracoes || !this.deleteCandidate) {
      return;
    }

    this.filiaisService.deleteFilial(this.deleteCandidate.id);
    this.refreshFiliais();
    this.deleteCandidate = null;
    this.successMessage = 'Filial excluída com sucesso.';
  }

  protected toggleFilialActions(filialId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openedActionMenuFilialId = this.openedActionMenuFilialId === filialId ? null : filialId;
  }

  protected isColaboradorSelected(colaboradorId: string): boolean {
    return this.form.colaboradoresIds.includes(colaboradorId);
  }

  protected toggleColaborador(colaboradorId: string, checked: boolean): void {
    if (checked && !this.form.colaboradoresIds.includes(colaboradorId)) {
      this.form.colaboradoresIds = [...this.form.colaboradoresIds, colaboradorId];
      return;
    }

    if (!checked) {
      this.form.colaboradoresIds = this.form.colaboradoresIds.filter((id) => id !== colaboradorId);
    }
  }

  protected getColaboradoresResumo(filial: Filial): string {
    const nomes = filial.colaboradoresIds
      .map((colaboradorId) => this.getColaboradorById(colaboradorId)?.nome)
      .filter((nome): nome is string => Boolean(nome));

    if (nomes.length === 0) {
      return 'Nenhum colaborador associado.';
    }

    return nomes.slice(0, 3).join(', ') + (nomes.length > 3 ? ` +${nomes.length - 3}` : '');
  }

  protected formatEndereco(filial: Filial): string {
    const { rua, numero, complemento, bairro, cidade, estado, cep } = filial.endereco;
    const primeiraLinha = [rua, numero].filter(Boolean).join(', ');
    const complementoTexto = complemento ? ` - ${complemento}` : '';
    const localidade = [bairro, cidade, estado].filter(Boolean).join(' · ');
    const cepTexto = cep ? ` · CEP ${cep}` : '';

    return `${primeiraLinha}${complementoTexto}${localidade ? ` · ${localidade}` : ''}${cepTexto}`;
  }

  protected goToMapa(): void {
    if (!this.filiaisService.hasFilialCadastrada()) {
      this.errorMessage = 'Cadastre ou ative uma filial antes de acessar o mapa de comandas.';
      return;
    }

    this.router.navigateByUrl('/mapa');
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  private validateForm(): string {
    if (!this.form.nome.trim()) {
      return 'Informe o nome/título da filial.';
    }

    if (!this.form.rua.trim()) {
      return 'Informe a rua ou avenida da filial.';
    }

    if (!this.form.numero.trim()) {
      return 'Informe o número do endereço.';
    }

    if (!this.form.bairro.trim()) {
      return 'Informe o bairro da filial.';
    }

    if (!this.form.cidade.trim()) {
      return 'Informe a cidade da filial.';
    }

    if (!this.form.estado.trim()) {
      return 'Informe o estado da filial.';
    }

    return '';
  }

  private getColaboradorById(id: string): Colaborador | null {
    return this.colaboradores.find((colaborador) => colaborador.id === id) ?? null;
  }

  private refreshFiliais(): void {
    this.filiais = this.filiaisService.getFiliais();
  }

  private createEmptyForm(): FilialFormModel {
    return {
      nome: '',
      descricao: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      colaboradoresIds: [],
      ativa: true,
    };
  }
}
