import { Injectable } from '@angular/core';

export type ImportExportExpectedType = 'array' | 'object' | 'string' | 'any';

export interface ImportExportEntry {
  alias: string;
  storageKey: string;
  expectedType: ImportExportExpectedType;
  defaultValue: unknown;
}

export interface ImportExportModule {
  id: string;
  label: string;
  description: string;
  fileName: string;
  entries: ImportExportEntry[];
}

export interface ParsedImportFile {
  fileName: string;
  data: unknown;
}

export interface ImportValidationResult {
  valid: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  private readonly modules: ImportExportModule[] = [
    {
      id: 'clientes',
      label: 'Clientes',
      description: 'Backup e restauração da base de clientes.',
      fileName: 'aqui-comanda-clientes.json',
      entries: [{ alias: 'clientes', storageKey: 'aqui-comanda:clientes', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'produtos',
      label: 'Produtos / Cardápio',
      description: 'Backup e restauração dos produtos do cardápio.',
      fileName: 'aqui-comanda-produtos.json',
      entries: [{ alias: 'produtos', storageKey: 'aqui-comanda:produtos', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'mesas',
      label: 'Mesas',
      description: 'Backup e restauração da configuração de mesas.',
      fileName: 'aqui-comanda-mesas.json',
      entries: [{ alias: 'mesas', storageKey: 'aqui-comanda:mesas', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'comandas',
      label: 'Comandas',
      description: 'Backup e restauração das comandas e histórico operacional.',
      fileName: 'aqui-comanda-comandas.json',
      entries: [{ alias: 'comandas', storageKey: 'aqui-comanda:open-comandas', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'pedidos',
      label: 'Pedidos Delivery',
      description: 'Backup e restauração dos pedidos para entrega.',
      fileName: 'aqui-comanda-pedidos.json',
      entries: [{ alias: 'pedidos', storageKey: 'aqui-comanda:pedidos', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'caixa',
      label: 'Caixa',
      description: 'Backup e restauração das entradas e sessões de caixa.',
      fileName: 'aqui-comanda-caixa.json',
      entries: [
        { alias: 'entradas', storageKey: 'aqui-comanda:caixa-entradas', expectedType: 'array', defaultValue: [] },
        { alias: 'sessoes', storageKey: 'aqui-comanda:caixa-sessoes', expectedType: 'array', defaultValue: [] },
      ],
    },
    {
      id: 'colaboradores',
      label: 'Colaboradores',
      description: 'Backup e restauração dos usuários internos e permissões.',
      fileName: 'aqui-comanda-colaboradores.json',
      entries: [{ alias: 'colaboradores', storageKey: 'aqui-comanda:colaboradores', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'filiais',
      label: 'Lojas / Filiais',
      description: 'Backup e restauração das unidades cadastradas.',
      fileName: 'aqui-comanda-filiais.json',
      entries: [{ alias: 'filiais', storageKey: 'aqui-comanda:filiais', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'configuracoes',
      label: 'Configurações visuais',
      description: 'Backup e restauração das personalizações do sistema.',
      fileName: 'aqui-comanda-configuracoes.json',
      entries: [{ alias: 'uiScale', storageKey: 'aqui-comanda:ui-scale', expectedType: 'string', defaultValue: 'medium' }],
    },
    {
      id: 'ordem-menu',
      label: 'Ordem do menu',
      description: 'Backup e restauração da ordem personalizada do menu.',
      fileName: 'aqui-comanda-ordem-menu.json',
      entries: [{ alias: 'ordemMenu', storageKey: 'aqui-comanda:menu-order', expectedType: 'array', defaultValue: [] }],
    },
  ];

  getModules(): ImportExportModule[] {
    return this.modules.map((module) => ({ ...module, entries: module.entries.map((entry) => ({ ...entry })) }));
  }

  getModule(moduleId: string): ImportExportModule | undefined {
    return this.getModules().find((module) => module.id === moduleId);
  }

  exportModule(module: ImportExportModule): void {
    const payload = this.createExportPayload(module);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = module.fileName;
    link.click();

    URL.revokeObjectURL(url);
  }

  async readJsonFile(file: File): Promise<ParsedImportFile> {
    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Selecione um arquivo .json válido.');
    }

    const content = await file.text();

    if (!content.trim()) {
      throw new Error('O arquivo selecionado está vazio.');
    }

    try {
      return {
        fileName: file.name,
        data: JSON.parse(content) as unknown,
      };
    } catch {
      throw new Error('Não foi possível ler o JSON. Verifique o arquivo e tente novamente.');
    }
  }

  validateImport(module: ImportExportModule, data: unknown): ImportValidationResult {
    if (module.entries.length === 1) {
      const entry = module.entries[0];
      const dataToValidate = this.isWrappedPayloadForSingleEntry(data, entry.alias) ? (data as Record<string, unknown>)[entry.alias] : data;
      return this.validateValue(dataToValidate, entry.expectedType, module.label);
    }

    if (!this.isRecord(data)) {
      return {
        valid: false,
        message: `O arquivo de ${module.label} precisa ser um objeto com os dados separados por chave.`,
      };
    }

    for (const entry of module.entries) {
      if (!(entry.alias in data)) {
        return {
          valid: false,
          message: `O arquivo não contém a chave obrigatória "${entry.alias}" para ${module.label}.`,
        };
      }

      const result = this.validateValue(data[entry.alias], entry.expectedType, `${module.label} / ${entry.alias}`);
      if (!result.valid) {
        return result;
      }
    }

    return { valid: true };
  }

  importModule(module: ImportExportModule, data: unknown): void {
    const validation = this.validateImport(module, data);

    if (!validation.valid) {
      throw new Error(validation.message ?? 'Arquivo incompatível.');
    }

    if (module.entries.length === 1) {
      const entry = module.entries[0];
      const value = this.isWrappedPayloadForSingleEntry(data, entry.alias) ? (data as Record<string, unknown>)[entry.alias] : data;
      this.writeStorageValue(entry.storageKey, value);
      return;
    }

    const record = data as Record<string, unknown>;
    for (const entry of module.entries) {
      this.writeStorageValue(entry.storageKey, record[entry.alias]);
    }
  }

  getRecordCount(module: ImportExportModule): number {
    return module.entries.reduce((total, entry) => {
      const value = this.readStorageValue(entry.storageKey, entry.defaultValue);

      if (Array.isArray(value)) {
        return total + value.length;
      }

      if (this.isRecord(value)) {
        return total + Object.keys(value).length;
      }

      return value ? total + 1 : total;
    }, 0);
  }

  hasData(module: ImportExportModule): boolean {
    return this.getRecordCount(module) > 0;
  }

  private createExportPayload(module: ImportExportModule): unknown {
    if (module.entries.length === 1) {
      const entry = module.entries[0];
      return this.readStorageValue(entry.storageKey, entry.defaultValue);
    }

    return module.entries.reduce<Record<string, unknown>>((payload, entry) => {
      payload[entry.alias] = this.readStorageValue(entry.storageKey, entry.defaultValue);
      return payload;
    }, {});
  }

  private readStorageValue(storageKey: string, defaultValue: unknown): unknown {
    if (typeof localStorage === 'undefined') {
      return defaultValue;
    }

    const storedValue = localStorage.getItem(storageKey);

    if (storedValue === null) {
      return defaultValue;
    }

    try {
      return JSON.parse(storedValue) as unknown;
    } catch {
      return storedValue;
    }
  }

  private writeStorageValue(storageKey: string, value: unknown): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(value));
    window.dispatchEvent(new StorageEvent('storage', { key: storageKey, newValue: JSON.stringify(value) }));
  }

  private validateValue(value: unknown, expectedType: ImportExportExpectedType, label: string): ImportValidationResult {
    if (expectedType === 'any') {
      return { valid: true };
    }

    if (expectedType === 'array' && !Array.isArray(value)) {
      return { valid: false, message: `O JSON de ${label} precisa ser uma lista.` };
    }

    if (expectedType === 'object' && !this.isRecord(value)) {
      return { valid: false, message: `O JSON de ${label} precisa ser um objeto.` };
    }

    if (expectedType === 'string' && typeof value !== 'string') {
      return { valid: false, message: `O JSON de ${label} precisa ser um texto.` };
    }

    return { valid: true };
  }

  private isWrappedPayloadForSingleEntry(data: unknown, alias: string): boolean {
    return this.isRecord(data) && alias in data && Object.keys(data).length === 1;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
