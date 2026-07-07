import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Colaborador, NivelAcesso, PermissaoTela, TelaSistema, telasSistema } from '../models/app-data';
import { AuthService } from '../services/auth.service';
import { ColaboradorPayload, ColaboradoresService } from '../services/colaboradores.service';
import { formatCpf, isValidCpf, normalizeCpf } from '../utils/cpf';

interface ColaboradorFormModel {
  nome: string;
  cpf: string;
  senha: string;
  nivel: NivelAcesso;
  ativo: boolean;
  permissoes: PermissaoTela[];
}

@Component({
  selector: 'app-colaboradores-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-stack management-page colaboradores-page">
      <section class="page-head colaboradores-head">
        <div>
          <h1>Colaboradores</h1>
          <p>Cadastre usuários internos e controle leitura/escrita por tela.</p>
        </div>
      </section>

      @if (errorMessage && !colaboradorModalOpen) {
        <section class="form-feedback colaboradores-feedback">{{ errorMessage }}</section>
      }

      @if (successMessage && !colaboradorModalOpen) {
        <section class="form-feedback success colaboradores-feedback">{{ successMessage }}</section>
      }

      <section class="management-list-card full-management-list colaboradores-list-card">
        <div class="list-card-head">
          <div>
            <h2>Colaboradores cadastrados</h2>
            <span>{{ colaboradores.length }} usuários internos</span>
          </div>
        </div>

        <div class="management-table colaboradores-table">
          <div class="management-table-head">
            <span>Colaborador</span>
            <span>CPF</span>
            <span>Nível</span>
            <span>Status</span>
            <span>Acessos</span>
            <span>Ações</span>
          </div>

          @for (colaborador of colaboradores; track colaborador.id) {
            <div class="management-table-row">
              <strong>{{ colaborador.nome }}</strong>
              <span>{{ formatCpfValue(colaborador.cpf || colaborador.usuario) }}</span>
              <span class="status-chip">{{ colaborador.nivel === 'admin' ? 'Admin' : 'Colaborador' }}</span>
              <span class="status-chip" [class.inativa]="!colaborador.ativo">
                {{ colaborador.ativo ? 'Ativo' : 'Inativo' }}
              </span>
              <span>{{ getAccessSummary(colaborador) }}</span>
              <div class="row-actions client-more-actions colaboradores-actions" (click)="$event.stopPropagation()">
                @if (canWriteColaboradores) {
                  <button
                    class="more-actions-button"
                    type="button"
                    [attr.aria-label]="'Abrir ações de ' + colaborador.nome"
                    [attr.aria-expanded]="openedActionMenuColaboradorId === colaborador.id"
                    (click)="toggleColaboradorActions(colaborador.id, $event)"
                  >
                    ⋮
                  </button>

                  @if (openedActionMenuColaboradorId === colaborador.id) {
                    <div class="row-actions-popup" role="menu">
                      <button type="button" role="menuitem" (click)="handleEditColaborador(colaborador)">
                        Editar
                      </button>
                      <button type="button" role="menuitem" (click)="handleToggleAtivo(colaborador)">
                        {{ colaborador.ativo ? 'Inativar' : 'Ativar' }}
                      </button>
                      @if (colaborador.id !== currentUser?.id && colaborador.id !== 'admin-default') {
                        <button class="danger" type="button" role="menuitem" (click)="handleDeleteColaborador(colaborador)">
                          Excluir
                        </button>
                      }
                    </div>
                  }
                } @else {
                  <span class="readonly-chip">Somente leitura</span>
                }
              </div>
            </div>
          } @empty {
            <div class="management-empty-state">
              <strong>Nenhum colaborador cadastrado</strong>
              <span>O usuário admin padrão será criado automaticamente.</span>
            </div>
          }
        </div>
      </section>

      @if (canWriteColaboradores) {
        <button
          class="floating-comanda-button floating-management-button"
          type="button"
          aria-label="Novo colaborador"
          (click)="openCreateModal()"
        >
          <span aria-hidden="true">+</span>
          <span>Novo colaborador</span>
        </button>
      }

      @if (colaboradorModalOpen) {
        <div class="comanda-modal-overlay" role="presentation">
          <section class="management-modal-card collaborator-modal-card" role="dialog" aria-modal="true" aria-labelledby="colaborador-modal-title">
            <button class="modal-close-button" type="button" aria-label="Fechar modal de colaborador" (click)="closeModal()">
              X
            </button>

            <header class="management-modal-header">
              <h2 id="colaborador-modal-title">{{ editingColaboradorId ? 'Editar colaborador' : 'Novo colaborador' }}</h2>
              <p>{{ editingColaboradorId ? 'Atualize dados, status e permissões do usuário interno.' : 'Cadastre um novo usuário interno e defina seus acessos no sistema.' }}</p>
            </header>

            <form class="management-form-card modal-management-form colaboradores-modal-form" (ngSubmit)="saveColaborador()">
              <div class="collaborator-form-grid">
                <label>
                  Nome
                  <input
                    type="text"
                    name="nome"
                    required
                    placeholder="Ex.: Ana Souza"
                    [(ngModel)]="form.nome"
                    (ngModelChange)="clearFeedback()"
                  />
                </label>

                <label>
                  CPF
                  <input
                    type="text"
                    name="cpf"
                    required
                    inputmode="numeric"
                    autocomplete="off"
                    maxlength="14"
                    placeholder="000.000.000-00"
                    [(ngModel)]="form.cpf"
                    (ngModelChange)="onCpfChange($event)"
                  />
                </label>

                <label>
                  Senha {{ editingColaboradorId ? '(preencha apenas para alterar)' : '' }}
                  <input
                    type="password"
                    name="senha"
                    [required]="!editingColaboradorId"
                    autocomplete="new-password"
                    placeholder="Digite uma senha"
                    [(ngModel)]="form.senha"
                    (ngModelChange)="clearFeedback()"
                  />
                </label>

                <label>
                  Nível de acesso
                  <select name="nivel" [(ngModel)]="form.nivel" (ngModelChange)="onNivelChange($event)">
                    <option value="admin">Admin</option>
                    <option value="colaborador">Colaborador</option>
                  </select>
                </label>

                <label class="toggle-field collaborator-active-toggle">
                  <input type="checkbox" name="ativo" [(ngModel)]="form.ativo" />
                  <span>Colaborador ativo</span>
                </label>
              </div>

              <section class="permissions-panel" aria-label="Permissões por tela">
                <div class="permissions-head">
                  <div>
                    <h3>Permissões por tela</h3>
                    <p>Leitura libera acesso à tela. Escrita libera ações de alteração.</p>
                  </div>
                  @if (form.nivel === 'admin') {
                    <span>Admin tem acesso total</span>
                  }
                </div>

                <div class="permissions-table">
                  <div class="permissions-row permissions-row-head">
                    <span>Tela</span>
                    <span>Leitura</span>
                    <span>Escrita</span>
                  </div>

                  @for (tela of telas; track tela.tela) {
                    <div class="permissions-row">
                      <strong>{{ tela.label }}</strong>
                      <label class="permission-check">
                        <input
                          type="checkbox"
                          [name]="'read-' + tela.tela"
                          [checked]="getPermissao(tela.tela).leitura"
                          [disabled]="form.nivel === 'admin' || tela.tela === 'colaboradores'"
                          (change)="setPermissao(tela.tela, 'leitura', $event)"
                        />
                        <span>Leitura</span>
                      </label>
                      <label class="permission-check">
                        <input
                          type="checkbox"
                          [name]="'write-' + tela.tela"
                          [checked]="getPermissao(tela.tela).escrita"
                          [disabled]="form.nivel === 'admin' || tela.tela === 'colaboradores' || !getPermissao(tela.tela).leitura"
                          (change)="setPermissao(tela.tela, 'escrita', $event)"
                        />
                        <span>Escrita</span>
                      </label>
                    </div>
                  }
                </div>
              </section>

              @if (errorMessage) {
                <div class="form-feedback">{{ errorMessage }}</div>
              }

              @if (successMessage && colaboradorModalOpen) {
                <div class="form-feedback success">{{ successMessage }}</div>
              }

              <div class="form-actions">
                <button class="primary-action-button" type="submit">
                  {{ editingColaboradorId ? 'Salvar alterações' : 'Cadastrar colaborador' }}
                </button>
                <button class="ghost-button" type="button" (click)="closeModal()">Cancelar</button>
              </div>
            </form>
          </section>
        </div>
      }
    </div>
  `,
})
export class ColaboradoresPageComponent {
  private readonly colaboradoresService = inject(ColaboradoresService);
  private readonly authService = inject(AuthService);

  protected readonly telas = telasSistema;
  protected colaboradores = this.colaboradoresService.getColaboradores();
  protected editingColaboradorId: string | null = null;
  protected colaboradorModalOpen = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected form: ColaboradorFormModel = this.createEmptyForm();
  protected openedActionMenuColaboradorId: string | null = null;

  protected get canWriteColaboradores(): boolean {
    return this.authService.canWrite('colaboradores');
  }

  protected get currentUser(): Colaborador | null {
    return this.authService.currentUser();
  }

  @HostListener('document:click')
  protected closeActionMenus(): void {
    this.openedActionMenuColaboradorId = null;
  }

  protected openCreateModal(): void {
    if (!this.canWriteColaboradores) {
      this.errorMessage = 'Você não tem permissão para cadastrar colaboradores.';
      return;
    }

    this.clearFeedback();
    this.editingColaboradorId = null;
    this.form = this.createEmptyForm();
    this.colaboradorModalOpen = true;
  }

  protected closeModal(): void {
    this.colaboradorModalOpen = false;
    this.clearFormKeepingFeedback();
  }

  protected saveColaborador(): void {
    this.clearFeedback();

    if (!this.canWriteColaboradores) {
      this.errorMessage = 'Você não tem permissão de escrita em Colaboradores.';
      return;
    }

    if (!this.form.nome.trim()) {
      this.errorMessage = 'Informe o nome do colaborador.';
      return;
    }

    const cpf = normalizeCpf(this.form.cpf);

    if (!cpf) {
      this.errorMessage = 'CPF é obrigatório.';
      return;
    }

    if (!isValidCpf(cpf)) {
      this.errorMessage = 'Informe um CPF válido.';
      return;
    }

    if (!this.editingColaboradorId && !this.form.senha.trim()) {
      this.errorMessage = 'Informe uma senha para o novo colaborador.';
      return;
    }

    if (this.colaboradoresService.hasCpf(cpf, this.editingColaboradorId ?? undefined)) {
      this.errorMessage = 'Já existe um colaborador cadastrado com este CPF.';
      return;
    }

    const payload: ColaboradorPayload = {
      nome: this.form.nome.trim(),
      cpf,
      senha: this.form.senha.trim() || undefined,
      nivel: this.form.nivel,
      ativo: this.form.ativo,
      permissoes: this.form.permissoes,
    };

    if (this.editingColaboradorId) {
      const updated = this.colaboradoresService.updateColaborador(this.editingColaboradorId, payload);
      if (!updated) {
        this.errorMessage = 'Não foi possível encontrar o colaborador para edição.';
        return;
      }
      this.successMessage = 'Colaborador atualizado com sucesso.';
    } else {
      this.colaboradoresService.createColaborador(payload);
      this.successMessage = 'Colaborador cadastrado com sucesso.';
    }

    this.refreshColaboradores();
    this.authService.refreshCurrentUser();
    this.colaboradorModalOpen = false;
    this.clearFormKeepingFeedback();
  }

  protected editColaborador(colaborador: Colaborador): void {
    if (!this.canWriteColaboradores) {
      this.errorMessage = 'Você não tem permissão para editar colaboradores.';
      return;
    }

    this.clearFeedback();
    this.editingColaboradorId = colaborador.id;
    this.form = {
      nome: colaborador.nome,
      cpf: formatCpf(colaborador.cpf || colaborador.usuario),
      senha: '',
      nivel: colaborador.nivel,
      ativo: colaborador.ativo,
      permissoes: this.colaboradoresService.normalizePermissoes(colaborador.permissoes, colaborador.nivel),
    };
    this.colaboradorModalOpen = true;
  }

  protected toggleAtivo(colaborador: Colaborador): void {
    if (!this.canWriteColaboradores) {
      this.errorMessage = 'Você não tem permissão para alterar colaboradores.';
      return;
    }

    if (colaborador.id === this.currentUser?.id) {
      this.errorMessage = 'O usuário logado não pode inativar a própria conta.';
      return;
    }

    this.colaboradoresService.toggleAtivo(colaborador.id);
    this.refreshColaboradores();
    this.successMessage = colaborador.ativo ? 'Colaborador inativado.' : 'Colaborador ativado.';
  }

  protected deleteColaborador(colaborador: Colaborador): void {
    if (!this.canWriteColaboradores) {
      this.errorMessage = 'Você não tem permissão para excluir colaboradores.';
      return;
    }

    if (colaborador.id === this.currentUser?.id || colaborador.id === 'admin-default') {
      this.errorMessage = 'Esse colaborador não pode ser excluído.';
      return;
    }

    this.colaboradoresService.deleteColaborador(colaborador.id);
    this.refreshColaboradores();
    this.successMessage = 'Colaborador excluído com sucesso.';
  }

  protected toggleColaboradorActions(colaboradorId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openedActionMenuColaboradorId = this.openedActionMenuColaboradorId === colaboradorId ? null : colaboradorId;
  }

  protected handleEditColaborador(colaborador: Colaborador): void {
    this.openedActionMenuColaboradorId = null;
    this.editColaborador(colaborador);
  }

  protected handleToggleAtivo(colaborador: Colaborador): void {
    this.openedActionMenuColaboradorId = null;
    this.toggleAtivo(colaborador);
  }

  protected handleDeleteColaborador(colaborador: Colaborador): void {
    this.openedActionMenuColaboradorId = null;
    this.deleteColaborador(colaborador);
  }

  protected resetForm(): void {
    this.clearFeedback();
    this.editingColaboradorId = null;
    this.form = this.createEmptyForm();
  }

  protected onCpfChange(value: string): void {
    this.form.cpf = formatCpf(value);
    this.clearFeedback();
  }

  protected formatCpfValue(value?: string): string {
    const cpf = normalizeCpf(value);
    return cpf ? formatCpf(cpf) : 'CPF não informado';
  }

  protected onNivelChange(nivel: NivelAcesso): void {
    this.form.nivel = nivel;
    this.form.permissoes = nivel === 'admin'
      ? this.colaboradoresService.createFullPermissoes()
      : this.colaboradoresService.normalizePermissoes(this.form.permissoes, 'colaborador');
  }

  protected getPermissao(tela: TelaSistema): PermissaoTela {
    return this.form.permissoes.find((permissao) => permissao.tela === tela) ?? {
      tela,
      leitura: false,
      escrita: false,
    };
  }

  protected setPermissao(tela: TelaSistema, tipo: 'leitura' | 'escrita', event: Event): void {
    if (this.form.nivel === 'admin' || tela === 'colaboradores') {
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;

    this.form.permissoes = this.form.permissoes.map((permissao) => {
      if (permissao.tela !== tela) {
        return permissao;
      }

      if (tipo === 'leitura') {
        return {
          ...permissao,
          leitura: checked,
          escrita: checked ? permissao.escrita : false,
        };
      }

      return {
        ...permissao,
        escrita: permissao.leitura && checked,
      };
    });
  }

  protected getAccessSummary(colaborador: Colaborador): string {
    if (colaborador.nivel === 'admin') {
      return 'Acesso total';
    }

    const leitura = colaborador.permissoes.filter((permissao) => permissao.leitura).length;
    const escrita = colaborador.permissoes.filter((permissao) => permissao.escrita).length;
    return `${leitura} leitura · ${escrita} escrita`;
  }

  protected clearFeedback(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private refreshColaboradores(): void {
    this.colaboradores = this.colaboradoresService.getColaboradores();
  }

  private clearFormKeepingFeedback(): void {
    this.editingColaboradorId = null;
    this.form = this.createEmptyForm();
  }

  private createEmptyForm(): ColaboradorFormModel {
    return {
      nome: '',
      cpf: '',
      senha: '',
      nivel: 'colaborador',
      ativo: true,
      permissoes: this.colaboradoresService.createReadOnlyPermissoes(),
    };
  }
}
