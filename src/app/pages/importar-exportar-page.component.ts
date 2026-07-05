import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationModalComponent } from '../components/confirmation-modal.component';
import { IconComponent } from '../components/icon.component';
import { AuthService } from '../services/auth.service';
import { FiliaisService } from '../services/filiais.service';
import {
  ImportExportModule,
  ImportExportModuleSummary,
  ImportExportService,
  ParsedImportFile,
} from '../services/import-export.service';

type ImportExportViewMode = 'grid' | 'cards';
type PendingImportMode = 'module' | 'full';

interface PendingImport {
  mode: PendingImportMode;
  module?: ImportExportModule;
  parsedFile: ParsedImportFile;
}

@Component({
  selector: 'app-importar-exportar-page',
  standalone: true,
  imports: [ConfirmationModalComponent, IconComponent, FormsModule],
  template: `
    <div class="page-stack settings-page import-export-page">
      <section class="page-head import-export-head">
        <div>
          <h1>Importação e Exportação</h1>
          <p>Gerencie backups completos ou coleções individuais dos dados reais do sistema.</p>
        </div>

        <div class="import-export-global-actions">
          <button
            class="ghost-button"
            type="button"
            [disabled]="isBusy"
            (click)="exportFullBackup()"
          >
            Exportar backup completo
          </button>

          @if (canImport()) {
            <label class="primary-action-button import-file-button" [class.disabled]="isBusy">
              Importar backup completo
              <input
                type="file"
                accept="application/json,.json"
                [disabled]="isBusy"
                (change)="onFullBackupSelected($event)"
              />
            </label>
          }
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
          <strong>Importação substitui os dados selecionados</strong>
          <p>Você pode restaurar o backup completo ou operar coleção por coleção com validação de formato antes da substituição.</p>
        </div>
      </section>

      <section class="import-export-toolbar" aria-label="Visualização das coleções">
        <div>
          <strong>Coleções disponíveis</strong>
          <span>{{ summaries.length }} coleções configuradas</span>
        </div>

        <div class="view-toggle" aria-label="Alternar visualização">
          <button type="button" [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'">
            Grid
          </button>
          <button type="button" [class.active]="viewMode === 'cards'" (click)="viewMode = 'cards'">
            Cards
          </button>
        </div>
      </section>

      @if (viewMode === 'grid') {
        <section class="management-list-card full-management-list import-export-table-panel">
          <div class="management-table import-export-table">
            <div class="management-table-head">
              <span>Coleção</span>
              <span>Descrição</span>
              <span>Registros</span>
              <span>Última atualização</span>
              <span>Ações</span>
            </div>

            @for (summary of summaries; track summary.module.id) {
              <div class="management-table-row">
                <div class="import-export-collection-title">
                  <span class="import-export-icon">
                    <app-icon [name]="summary.module.icon" [size]="20" />
                  </span>
                  <strong>{{ summary.module.label }}</strong>
                </div>
                <span>{{ summary.module.description }}</span>
                <span>{{ summary.recordCount }}</span>
                <span>{{ formatLastUpdated(summary.lastUpdated) }}</span>
                <div class="import-export-row-actions">
                  <button class="ghost-button" type="button" [disabled]="isBusy" (click)="exportModule(summary.module)">
                    Exportar
                  </button>
                  @if (canImport()) {
                    <label class="primary-action-button import-file-button compact" [class.disabled]="isBusy">
                      Importar
                      <input
                        type="file"
                        accept="application/json,.json"
                        [disabled]="isBusy"
                        (change)="onFileSelected(summary.module, $event)"
                      />
                    </label>
                    <button
                      class="ghost-button"
                      type="button"
                      [disabled]="isBusy"
                      (click)="openJsonImportModal(summary.module)"
                    >
                      Importar JSON
                    </button>
                    <button
                      class="ghost-button danger-action"
                      type="button"
                      [disabled]="isBusy || summary.recordCount === 0"
                      (click)="openClearConfirmation(summary)"
                    >
                      Apagar
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      } @else {
        <section class="import-export-grid" aria-label="Coleções em cards">
          @for (summary of summaries; track summary.module.id) {
            <article class="import-export-card">
              <header>
                <span class="import-export-icon">
                  <app-icon [name]="summary.module.icon" [size]="24" />
                </span>
                <div>
                  <h2>{{ summary.module.label }}</h2>
                  <p>{{ summary.module.description }}</p>
                </div>
                <span class="settings-current-badge">{{ summary.recordCount }} registros</span>
              </header>

              <div class="import-export-meta">
                <span>Última atualização</span>
                <strong>{{ formatLastUpdated(summary.lastUpdated) }}</strong>
              </div>

              <div class="import-export-keys">
                @for (entry of summary.module.entries; track entry.storageKey) {
                  <code>{{ entry.storageKey }}</code>
                }
              </div>

              <div class="import-export-actions">
                <button class="ghost-button" type="button" [disabled]="isBusy" (click)="exportModule(summary.module)">
                  Exportar JSON
                </button>

                @if (canImport()) {
                  <label class="primary-action-button import-file-button" [class.disabled]="isBusy">
                    Importar arquivo
                    <input
                      type="file"
                      accept="application/json,.json"
                      [disabled]="isBusy"
                      (change)="onFileSelected(summary.module, $event)"
                    />
                  </label>
                  <button
                    class="ghost-button"
                    type="button"
                    [disabled]="isBusy"
                    (click)="openJsonImportModal(summary.module)"
                  >
                    Importar JSON
                  </button>
                  <button
                    class="ghost-button danger-action"
                    type="button"
                    [disabled]="isBusy || summary.recordCount === 0"
                    (click)="openClearConfirmation(summary)"
                  >
                    Apagar coleção
                  </button>
                }
              </div>
            </article>
          }
        </section>
      }

      @if (pendingImport) {
        <app-confirmation-modal
          [title]="getImportConfirmationTitle(pendingImport)"
          [description]="getImportConfirmationDescription(pendingImport)"
          confirmLabel="Substituir dados"
          cancelLabel="Cancelar"
          [danger]="true"
          (confirm)="confirmImport()"
          (cancel)="cancelImport()"
        />
      }

      @if (jsonImportModule) {
        <section class="confirmation-dialog json-import-dialog" role="dialog" aria-modal="true" aria-labelledby="json-import-title">
          <div class="confirmation-card json-import-card">
            <h3 id="json-import-title">Importar {{ jsonImportModule.label }} via JSON</h3>
            <p>Cole abaixo um JSON válido contendo os registros que deseja importar para {{ jsonImportModule.label }}.</p>

            <label class="json-import-field">
              JSON
              <textarea
                name="jsonImportContent"
                rows="14"
                placeholder='[
  {
    "nome": "Cliente Teste",
    "telefone": "(48) 99999-9999",
    "ativo": true
  }
]'
                [(ngModel)]="jsonImportContent"
                (ngModelChange)="resetJsonValidation()"
              ></textarea>
            </label>

            @if (jsonImportError) {
              <div class="form-feedback">{{ jsonImportError }}</div>
            }

            @if (jsonImportValidMessage) {
              <div class="form-feedback success">{{ jsonImportValidMessage }}</div>
            }

            @if (jsonImportPreview.length > 0) {
              <div class="json-import-preview">
                <span>Prévia dos primeiros registros</span>
                @for (row of jsonImportPreview; track row) {
                  <code>{{ row }}</code>
                }
              </div>
            }

            <div class="confirmation-actions json-import-actions">
              <button class="modal-secondary-action" type="button" [disabled]="isBusy" (click)="closeJsonImportModal()">
                Cancelar
              </button>
              <button class="ghost-button" type="button" [disabled]="isBusy || !jsonImportContent.trim()" (click)="validateJsonImport()">
                Validar JSON
              </button>
              <button
                class="modal-primary-action"
                type="button"
                [disabled]="isBusy || !jsonImportData || !!jsonImportError"
                (click)="confirmJsonImport()"
              >
                Confirmar importação
              </button>
            </div>
          </div>
        </section>
      }

      @if (pendingClear) {
        <app-confirmation-modal
          title="Apagar {{ pendingClear.module.label }}?"
          [description]="getClearConfirmationDescription(pendingClear)"
          confirmLabel="Confirmar exclusão"
          cancelLabel="Cancelar"
          [danger]="true"
          (confirm)="confirmClearCollection()"
          (cancel)="cancelClearCollection()"
        />
      }
    </div>
  `,
})
export class ImportarExportarPageComponent {
  private readonly importExportService = inject(ImportExportService);
  private readonly authService = inject(AuthService);
  private readonly filiaisService = inject(FiliaisService);

  protected summaries = this.importExportService.getCollectionSummary();
  protected viewMode: ImportExportViewMode = 'grid';
  protected pendingImport: PendingImport | null = null;
  protected pendingClear: ImportExportModuleSummary | null = null;
  protected jsonImportModule: ImportExportModule | null = null;
  protected jsonImportContent = '';
  protected jsonImportData: unknown = null;
  protected jsonImportPreview: string[] = [];
  protected jsonImportError = '';
  protected jsonImportValidMessage = '';
  protected errorMessage = '';
  protected successMessage = '';
  protected isBusy = false;

  protected canImport(): boolean {
    return this.authService.canWrite('configuracoes');
  }

  protected exportFullBackup(): void {
    this.runOperation(() => {
      this.importExportService.exportFullBackup();
      this.successMessage = 'Backup completo exportado com sucesso.';
    });
  }

  protected exportModule(module: ImportExportModule): void {
    this.runOperation(() => {
      if (!this.importExportService.hasData(module)) {
        this.errorMessage = `Não há dados em ${module.label} para exportar.`;
        return;
      }

      this.importExportService.exportModule(module);
      this.successMessage = `${module.label} exportado com sucesso.`;
    });
  }

  protected async onFullBackupSelected(event: Event): Promise<void> {
    await this.handleFileSelection(event, async (parsedFile) => {
      const validation = this.importExportService.validateFullBackup(parsedFile.data);

      if (!validation.valid) {
        this.errorMessage = validation.message ?? 'Backup completo incompatível.';
        return;
      }

      this.pendingImport = { mode: 'full', parsedFile };
    });
  }

  protected async onFileSelected(module: ImportExportModule, event: Event): Promise<void> {
    await this.handleFileSelection(event, async (parsedFile) => {
      const validation = this.importExportService.validateImport(module, parsedFile.data);

      if (!validation.valid) {
        this.errorMessage = validation.message ?? 'Arquivo incompatível com a coleção selecionada.';
        return;
      }

      this.pendingImport = { mode: 'module', module, parsedFile };
    });
  }

  protected getImportConfirmationTitle(pendingImport: PendingImport): string {
    return pendingImport.mode === 'full'
      ? 'Importar backup completo?'
      : `Importar ${pendingImport.module?.label}?`;
  }

  protected getImportConfirmationDescription(pendingImport: PendingImport): string {
    if (pendingImport.mode === 'full') {
      return `O arquivo ${pendingImport.parsedFile.fileName} substituirá todas as coleções configuradas. Essa ação não poderá ser desfeita.`;
    }

    return `O arquivo ${pendingImport.parsedFile.fileName} substituirá os dados atuais de ${pendingImport.module?.label}. Nenhuma outra coleção será alterada.`;
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

    this.runOperation(() => {
      const pendingImport = this.pendingImport!;

      if (pendingImport.mode === 'full') {
        this.importExportService.importFullBackup(pendingImport.parsedFile.data);
        this.reloadAfterImport();
        this.pendingImport = null;
        this.successMessage = 'Backup completo importado com sucesso.';
        return;
      }

      this.importExportService.importModule(pendingImport.module!, pendingImport.parsedFile.data);
      this.reloadAfterImport(pendingImport.module);
      this.pendingImport = null;
      this.successMessage = `${pendingImport.module!.label} importado com sucesso.`;
    });
  }

  protected openClearConfirmation(summary: ImportExportModuleSummary): void {
    this.clearFeedback();
    this.pendingClear = summary;
  }

  protected openJsonImportModal(module: ImportExportModule): void {
    this.clearFeedback();
    this.jsonImportModule = module;
    this.jsonImportContent = '';
    this.jsonImportData = null;
    this.jsonImportPreview = [];
    this.jsonImportError = '';
    this.jsonImportValidMessage = '';
  }

  protected closeJsonImportModal(): void {
    this.jsonImportModule = null;
    this.jsonImportContent = '';
    this.jsonImportData = null;
    this.jsonImportPreview = [];
    this.jsonImportError = '';
    this.jsonImportValidMessage = '';
  }

  protected resetJsonValidation(): void {
    this.jsonImportData = null;
    this.jsonImportPreview = [];
    this.jsonImportError = '';
    this.jsonImportValidMessage = '';
  }

  protected validateJsonImport(): void {
    this.jsonImportError = '';
    this.jsonImportValidMessage = '';
    this.jsonImportData = null;
    this.jsonImportPreview = [];

    if (!this.jsonImportModule) {
      return;
    }

    const content = this.jsonImportContent.trim();

    if (!content) {
      this.jsonImportError = 'Cole um JSON antes de validar.';
      return;
    }

    let data: unknown;

    try {
      data = JSON.parse(content) as unknown;
    } catch {
      this.jsonImportError = 'JSON inválido. Verifique vírgulas, aspas e fechamento de colchetes/chaves.';
      return;
    }

    const validation = this.importExportService.validateJsonImport(this.jsonImportModule, data);

    if (!validation.valid) {
      this.jsonImportError = validation.message ?? 'JSON inválido. Verifique se o conteúdo está no formato correto.';
      return;
    }

    const recordCount = this.importExportService.getImportRecordCount(this.jsonImportModule, data);

    if (recordCount <= 0) {
      this.jsonImportError = 'O JSON precisa conter pelo menos um registro.';
      return;
    }

    this.jsonImportData = data;
    this.jsonImportPreview = this.importExportService.getImportPreviewRows(this.jsonImportModule, data);
    this.jsonImportValidMessage = `JSON válido. Foram encontrados ${recordCount} registro${recordCount === 1 ? '' : 's'} para importar em ${this.jsonImportModule.label}.`;
  }

  protected confirmJsonImport(): void {
    if (!this.jsonImportModule || !this.jsonImportData) {
      return;
    }

    if (!this.canImport()) {
      this.jsonImportError = 'Você não tem permissão para importar dados.';
      return;
    }

    this.runOperation(() => {
      const module = this.jsonImportModule!;
      this.importExportService.importModule(module, this.jsonImportData);
      this.reloadAfterImport(module);
      this.closeJsonImportModal();
      this.successMessage = `${module.label} importado com sucesso via JSON.`;
    });
  }

  protected cancelClearCollection(): void {
    this.pendingClear = null;
  }

  protected confirmClearCollection(): void {
    if (!this.pendingClear) {
      return;
    }

    if (!this.canImport()) {
      this.errorMessage = 'Você não tem permissão para apagar dados.';
      return;
    }

    this.runOperation(() => {
      const module = this.pendingClear!.module;
      this.importExportService.clearModule(module);
      this.reloadAfterImport(module);
      this.pendingClear = null;
      this.successMessage = `${module.label} apagado com sucesso.`;
    });
  }

  protected getClearConfirmationDescription(summary: ImportExportModuleSummary): string {
    return `Tem certeza que deseja apagar todos os registros de ${summary.module.label}? Essa ação removerá ${summary.recordCount} registro${summary.recordCount === 1 ? '' : 's'} e não poderá ser desfeita.`;
  }

  protected formatLastUpdated(value?: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private async handleFileSelection(
    event: Event,
    onParsed: (parsedFile: ParsedImportFile) => Promise<void> | void,
  ): Promise<void> {
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

    this.isBusy = true;
    try {
      const parsedFile = await this.importExportService.readJsonFile(file);
      await onParsed(parsedFile);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível ler o arquivo selecionado.';
    } finally {
      this.isBusy = false;
    }
  }

  private runOperation(operation: () => void): void {
    this.clearFeedback();
    this.isBusy = true;

    try {
      operation();
      this.refreshSummaries();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
    } finally {
      this.isBusy = false;
    }
  }

  private reloadAfterImport(module?: ImportExportModule): void {
    if (!module || module.id === 'filiais') {
      this.filiaisService.reloadFromStorage();
    }
  }

  private refreshSummaries(): void {
    this.summaries = this.importExportService.getCollectionSummary();
  }

  private clearFeedback(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
