import { Component, inject } from '@angular/core';
import { ConfirmationModalComponent } from '../components/confirmation-modal.component';
import { AuthService } from '../services/auth.service';
import { ImportExportModule, ImportExportService, ParsedImportFile } from '../services/import-export.service';

interface PendingImport {
  module: ImportExportModule;
  parsedFile: ParsedImportFile;
}

@Component({
  selector: 'app-importar-exportar-page',
  standalone: true,
  imports: [ConfirmationModalComponent],
  template: `
    <div class="page-stack settings-page import-export-page">
      <section class="page-head">
        <div>
          <h1>Importar / Exportar</h1>
          <p>Faça backup e restauração separados dos principais dados do sistema em JSON.</p>
        </div>
      </section>

      @if (errorMessage) {
        <div class="form-feedback import-export-feedback">{{ errorMessage }}</div>
      }

      @if (successMessage) {
        <div class="form-feedback success import-export-feedback">{{ successMessage }}</div>
      }

      <section class="settings-card import-export-warning">
        <div>
          <strong>Importação substitui apenas o módulo selecionado</strong>
          <p>Exemplo: importar clientes substitui clientes, mas não altera produtos, mesas, pedidos ou caixa.</p>
        </div>
      </section>

      <section class="import-export-grid" aria-label="Módulos disponíveis para importar e exportar">
        @for (module of modules; track module.id) {
          <article class="import-export-card">
            <header>
              <div>
                <h2>{{ module.label }}</h2>
                <p>{{ module.description }}</p>
              </div>
              <span class="settings-current-badge">{{ getRecordCount(module) }} registros</span>
            </header>

            <div class="import-export-keys">
              @for (entry of module.entries; track entry.storageKey) {
                <code>{{ entry.storageKey }}</code>
              }
            </div>

            <div class="import-export-actions">
              <button class="ghost-button" type="button" (click)="exportModule(module)">
                Exportar JSON
              </button>

              @if (canImport()) {
                <label class="primary-action-button import-file-button">
                  Importar JSON
                  <input type="file" accept="application/json,.json" (change)="onFileSelected(module, $event)" />
                </label>
              } @else {
                <button class="primary-action-button" type="button" disabled>
                  Importar JSON
                </button>
              }
            </div>
          </article>
        }
      </section>

      @if (pendingImport) {
        <app-confirmation-modal
          title="Importar {{ pendingImport.module.label }}?"
          [description]="getImportConfirmationDescription(pendingImport)"
          confirmLabel="Substituir dados"
          cancelLabel="Cancelar"
          [danger]="true"
          (confirm)="confirmImport()"
          (cancel)="cancelImport()"
        />
      }
    </div>
  `,
})
export class ImportarExportarPageComponent {
  private readonly importExportService = inject(ImportExportService);
  private readonly authService = inject(AuthService);

  protected modules = this.importExportService.getModules();
  protected pendingImport: PendingImport | null = null;
  protected errorMessage = '';
  protected successMessage = '';

  protected canImport(): boolean {
    return this.authService.canWrite('configuracoes');
  }

  protected getRecordCount(module: ImportExportModule): number {
    return this.importExportService.getRecordCount(module);
  }

  protected exportModule(module: ImportExportModule): void {
    this.clearFeedback();

    if (!this.importExportService.hasData(module)) {
      this.errorMessage = `Não há dados em ${module.label} para exportar.`;
      return;
    }

    this.importExportService.exportModule(module);
    this.successMessage = `${module.label} exportado com sucesso.`;
  }

  protected async onFileSelected(module: ImportExportModule, event: Event): Promise<void> {
    this.clearFeedback();

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!this.canImport()) {
      this.errorMessage = 'Você não tem permissão para importar dados.';
      return;
    }

    if (!file) {
      return;
    }

    try {
      const parsedFile = await this.importExportService.readJsonFile(file);
      const validation = this.importExportService.validateImport(module, parsedFile.data);

      if (!validation.valid) {
        this.errorMessage = validation.message ?? 'Arquivo incompatível com o módulo selecionado.';
        return;
      }

      this.pendingImport = { module, parsedFile };
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível ler o arquivo selecionado.';
    }
  }

  protected getImportConfirmationDescription(pendingImport: PendingImport): string {
    return `O arquivo ${pendingImport.parsedFile.fileName} substituirá os dados atuais de ${pendingImport.module.label}. Nenhum outro módulo será alterado.`;
  }

  protected cancelImport(): void {
    this.pendingImport = null;
  }

  protected confirmImport(): void {
    if (!this.pendingImport) {
      return;
    }

    if (!this.canImport()) {
      this.errorMessage = 'Você não tem permissão para importar dados.';
      return;
    }

    try {
      const moduleLabel = this.pendingImport.module.label;
      this.importExportService.importModule(this.pendingImport.module, this.pendingImport.parsedFile.data);
      this.modules = this.importExportService.getModules();
      this.pendingImport = null;
      this.successMessage = `${moduleLabel} importado com sucesso.`;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível importar os dados.';
    }
  }

  private clearFeedback(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
