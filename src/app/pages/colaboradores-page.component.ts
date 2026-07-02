import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Colaborador, NivelAcesso, PermissaoTela, TelaSistema, telasSistema } from '../models/app-data';
import { AuthService } from '../services/auth.service';
import { ColaboradorPayload, ColaboradoresService } from '../services/colaboradores.service';

interface ColaboradorFormModel {
  nome: string;
  usuario: string;
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

      @if (errorMessage) {
        <section class="form-feedback colaboradores-feedback">{{ errorMessage }}</section>
      }

      @if (successMessage) {
        <section class="form-feedback success colaboradores-feedback">{{ successMessage }}</section>
      }

      <section class="management-grid colaboradores-grid">
        <form class="management-form-card colaboradores-form" (ngSubmit)="saveColaborador()">
          <div class="form-card-head">
            <h2>{{ editingColaboradorId ? 'Editar colaborador' : 'Novo colaborador' }}</h2>
            @if (editingColaboradorId) {
              <button class="ghost-button" type="button" (click)="resetForm()">Cancelar edição</button>
            }
          </div>

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
            Usuário/login
            <input
              type="text"
              name="usuario"
              required
              autocomplete="off"
              placeholder="Ex.: ana.caixa"
              [(ngModel)]="form.usuario"
              (ngModelChange)="clearFeedback()"
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

          <label class="toggle-field">
            <input type="checkbox" name="ativo" [(ngModel)]="form.ativo" />
            <span>Colaborador ativo</span>
          </label>

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

          <div class="form-actions">
            <button class="primary-action-button" type="submit">
              {{ editingColaboradorId ? 'Salvar alterações' : 'Cadastrar colaborador' }}
            </button>
            <button class="ghost-button" type="button" (click)="resetForm()">Cancelar</button>
          </div>
        </form>

        <section class="management-list-card colaboradores-list-card">
          <div class="list-card-head">
            <div>
              <h2>Colaboradores cadastrados</h2>
              <span>{{ colaboradores.length }} usuários internos</span>
            </div>
          </div>

          <div class="management-table colaboradores-table">
            <div class="management-table-head">
              <span>Colaborador</span>
              <span>Usuário</span>
              <span>Nível</span>
              <span>Status</span>
              <span>Acessos</span>
              <span>Ações</span>
            </div>

            @for (colaborador of colaboradores; track colaborador.id) {
              <div class="management-table-row">
                <strong>{{ colaborador.nome }}</strong>
                <span>{{ colaborador.usuario }}</span>
                <span class="status-chip">{{ colaborador.nivel === 'admin' ? 'Admin' : 'Colaborador' }}</span>
                <span class="status-chip" [class.inativa]="!colaborador.ativo">
                  {{ colaborador.ativo ? 'Ativo' : 'Inativo' }}
                </span>
                <span>{{ getAccessSummary(colaborador) }}</span>
                <div class="row-actions colaboradores-actions">
                  <button type="button" (click)="editColaborador(colaborador)">Editar</button>
                  <button type="button" (click)="toggleAtivo(colaborador)">
                    {{ colaborador.ativo ? 'Inativar' : 'Ativar' }}
                  </button>
                  @if (colaborador.id !== currentUser?.id && colaborador.id !== 'admin-default') {
                    <button class="danger" type="button" (click)="deleteColaborador(colaborador)">Excluir</button>
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
      </section>
    </div>
  `,
})
export class ColaboradoresPageComponent {
  private readonly colaboradoresService = inject(ColaboradoresService);
  private readonly authService = inject(AuthService);

  protected readonly telas = telasSistema;
  protected colaboradores = this.colaboradoresService.getColaboradores();
  protected editingColaboradorId: string | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  protected form: ColaboradorFormModel = this.createEmptyForm();

  protected get currentUser(): Colaborador | null {
    return this.authService.currentUser();
  }

  protected saveColaborador(): void {
    this.clearFeedback();

    if (!this.form.nome.trim()) {
      this.errorMessage = 'Informe o nome do colaborador.';
      return;
    }

    if (!this.form.usuario.trim()) {
      this.errorMessage = 'Informe o usuário/login.';
      return;
    }

    if (!this.editingColaboradorId && !this.form.senha.trim()) {
      this.errorMessage = 'Informe uma senha para o novo colaborador.';
      return;
    }

    if (this.colaboradoresService.hasUsuario(this.form.usuario, this.editingColaboradorId ?? undefined)) {
      this.errorMessage = 'Já existe um colaborador com esse usuário/login.';
      return;
    }

    const payload: ColaboradorPayload = {
      nome: this.form.nome.trim(),
      usuario: this.form.usuario.trim(),
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
    this.clearFormKeepingFeedback();
  }

  protected editColaborador(colaborador: Colaborador): void {
    this.clearFeedback();
    this.editingColaboradorId = colaborador.id;
    this.form = {
      nome: colaborador.nome,
      usuario: colaborador.usuario,
      senha: '',
      nivel: colaborador.nivel,
      ativo: colaborador.ativo,
      permissoes: this.colaboradoresService.normalizePermissoes(colaborador.permissoes, colaborador.nivel),
    };
  }

  protected toggleAtivo(colaborador: Colaborador): void {
    if (colaborador.id === this.currentUser?.id) {
      this.errorMessage = 'O usuário logado não pode inativar a própria conta.';
      return;
    }

    this.colaboradoresService.toggleAtivo(colaborador.id);
    this.refreshColaboradores();
    this.successMessage = colaborador.ativo ? 'Colaborador inativado.' : 'Colaborador ativado.';
  }

  protected deleteColaborador(colaborador: Colaborador): void {
    if (colaborador.id === this.currentUser?.id || colaborador.id === 'admin-default') {
      this.errorMessage = 'Esse colaborador não pode ser excluído.';
      return;
    }

    this.colaboradoresService.deleteColaborador(colaborador.id);
    this.refreshColaboradores();
    this.successMessage = 'Colaborador excluído com sucesso.';
  }

  protected resetForm(): void {
    this.clearFeedback();
    this.editingColaboradorId = null;
    this.form = this.createEmptyForm();
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
      usuario: '',
      senha: '',
      nivel: 'colaborador',
      ativo: true,
      permissoes: this.colaboradoresService.createReadOnlyPermissoes(),
    };
  }
}
