import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Cliente } from '../models/app-data';
import { ClientePayload, ClientesService } from '../services/clientes.service';

interface ClienteFormModel {
  nome: string;
  cpf: string;
  dataNascimento: string;
  endereco: string;
}

@Component({
  selector: 'app-clientes-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-stack management-page">
      <section class="page-head">
        <div>
          <h1>Clientes</h1>
          <p>Cadastre clientes para agilizar o atendimento e vincular dados às comandas.</p>
        </div>
      </section>

      <section class="management-grid">
        <form class="management-form-card" (ngSubmit)="saveCliente()">
          <div class="form-card-head">
            <h2>{{ editingClienteId ? 'Editar cliente' : 'Novo cliente' }}</h2>
            @if (editingClienteId) {
              <button class="ghost-button" type="button" (click)="resetForm()">Cancelar edição</button>
            }
          </div>

          <label>
            Nome completo
            <input
              type="text"
              name="nome"
              required
              placeholder="Ex.: João da Silva"
              [(ngModel)]="form.nome"
            />
          </label>

          <label>
            CPF
            <input
              type="text"
              name="cpf"
              inputmode="numeric"
              maxlength="14"
              required
              placeholder="000.000.000-00"
              [ngModel]="form.cpf"
              (ngModelChange)="onCpfChange($event)"
            />
          </label>

          <label>
            Data de nascimento
            <input
              type="date"
              name="dataNascimento"
              required
              [(ngModel)]="form.dataNascimento"
            />
          </label>

          <label>
            Endereço
            <textarea
              name="endereco"
              rows="4"
              placeholder="Rua, número, bairro, cidade..."
              [(ngModel)]="form.endereco"
            ></textarea>
          </label>

          @if (errorMessage) {
            <div class="form-feedback">{{ errorMessage }}</div>
          }

          @if (successMessage) {
            <div class="form-feedback success">{{ successMessage }}</div>
          }

          <div class="form-actions">
            <button class="primary-action-button" type="submit" [disabled]="!canWriteClientes">
              {{ editingClienteId ? 'Salvar alterações' : 'Cadastrar cliente' }}
            </button>
            <button class="ghost-button" type="button" (click)="resetForm()">Cancelar</button>
          </div>
        </form>

        <section class="management-list-card">
          <div class="list-card-head">
            <div>
              <h2>Clientes cadastrados</h2>
              <span>{{ clientes.length }} clientes no sistema</span>
            </div>
          </div>

          <div class="management-table client-table">
            <div class="management-table-head">
              <span>Cliente</span>
              <span>CPF</span>
              <span>Nascimento</span>
              <span>Endereço</span>
              <span>Ações</span>
            </div>

            @for (cliente of clientes; track cliente.id) {
              <div class="management-table-row">
                <strong>{{ cliente.nome }}</strong>
                <span>{{ cliente.cpf }}</span>
                <span>{{ formatDate(cliente.dataNascimento) }}</span>
                <span>{{ cliente.endereco || '-' }}</span>
                <div class="row-actions">
                  @if (canWriteClientes) {
                    <button type="button" (click)="editCliente(cliente)">Editar</button>
                    <button class="danger" type="button" (click)="deleteCliente(cliente)">Excluir</button>
                  } @else {
                    <span class="readonly-chip">Somente leitura</span>
                  }
                </div>
              </div>
            } @empty {
              <div class="management-empty-state">
                <strong>Nenhum cliente cadastrado</strong>
                <span>Use o formulário ao lado para cadastrar o primeiro cliente.</span>
              </div>
            }
          </div>
        </section>
      </section>
    </div>
  `,
})
export class ClientesPageComponent {
  private readonly clientesService = inject(ClientesService);
  private readonly authService = inject(AuthService);

  protected get canWriteClientes(): boolean {
    return this.authService.canWrite('clientes');
  }

  protected clientes = this.clientesService.getClientes();
  protected editingClienteId: string | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  protected form: ClienteFormModel = this.createEmptyForm();

  protected saveCliente(): void {
    if (!this.canWriteClientes) {
      this.errorMessage = 'Você não tem permissão de escrita em Clientes.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.nome.trim()) {
      this.errorMessage = 'Informe o nome completo do cliente.';
      return;
    }

    if (!this.isCpfComplete(this.form.cpf)) {
      this.errorMessage = 'Informe um CPF válido no formato 000.000.000-00.';
      return;
    }

    if (!this.form.dataNascimento) {
      this.errorMessage = 'Informe a data de nascimento do cliente.';
      return;
    }

    const cpfAlreadyExists = this.clientes.some(
      (cliente) => cliente.cpf === this.form.cpf && cliente.id !== this.editingClienteId,
    );

    if (cpfAlreadyExists) {
      this.errorMessage = 'Já existe um cliente cadastrado com esse CPF.';
      return;
    }

    const payload: ClientePayload = {
      nome: this.form.nome.trim(),
      cpf: this.form.cpf,
      dataNascimento: this.form.dataNascimento,
      endereco: this.form.endereco.trim() || undefined,
    };

    if (this.editingClienteId) {
      this.clientesService.updateCliente(this.editingClienteId, payload);
      this.successMessage = 'Cliente atualizado com sucesso.';
    } else {
      this.clientesService.createCliente(payload);
      this.successMessage = 'Cliente cadastrado com sucesso.';
    }

    this.refreshClientes();
    this.clearFormKeepingFeedback();
  }

  protected editCliente(cliente: Cliente): void {
    if (!this.canWriteClientes) {
      this.errorMessage = 'Você não tem permissão para editar clientes.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.editingClienteId = cliente.id;
    this.form = {
      nome: cliente.nome,
      cpf: cliente.cpf,
      dataNascimento: cliente.dataNascimento,
      endereco: cliente.endereco ?? '',
    };
  }

  protected deleteCliente(cliente: Cliente): void {
    if (!this.canWriteClientes) {
      this.errorMessage = 'Você não tem permissão para excluir clientes.';
      return;
    }

    if (this.editingClienteId === cliente.id) {
      this.resetForm();
    }

    this.clientesService.deleteCliente(cliente.id);
    this.refreshClientes();
    this.successMessage = 'Cliente excluído com sucesso.';
  }

  protected resetForm(): void {
    this.editingClienteId = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.form = this.createEmptyForm();
  }

  protected onCpfChange(value: string): void {
    this.form.cpf = this.formatCpf(value);
  }

  protected formatDate(value: string): string {
    if (!value) {
      return '-';
    }

    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  private refreshClientes(): void {
    this.clientes = this.clientesService.getClientes();
  }

  private clearFormKeepingFeedback(): void {
    this.editingClienteId = null;
    this.errorMessage = '';
    this.form = this.createEmptyForm();
  }

  private createEmptyForm(): ClienteFormModel {
    return {
      nome: '',
      cpf: '',
      dataNascimento: '',
      endereco: '',
    };
  }

  private formatCpf(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  private isCpfComplete(value: string): boolean {
    return value.replace(/\D/g, '').length === 11;
  }
}
