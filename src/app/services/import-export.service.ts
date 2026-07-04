import { Injectable } from '@angular/core';
import type { IconName } from '../components/icon.component';

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
  icon: IconName;
  entries: ImportExportEntry[];
}

export interface ImportExportModuleSummary {
  module: ImportExportModule;
  recordCount: number;
  lastUpdated?: string;
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
      icon: 'users',
      entries: [{ alias: 'clientes', storageKey: 'aqui-comanda:clientes', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'produtos',
      label: 'Produtos / Cardápio',
      description: 'Backup e restauração dos produtos do cardápio.',
      fileName: 'aqui-comanda-produtos.json',
      icon: 'cards',
      entries: [{ alias: 'produtos', storageKey: 'aqui-comanda:produtos', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'estoque',
      label: 'Entrada de Estoque',
      description: 'Backup e restauração do histórico de entradas de estoque.',
      fileName: 'aqui-comanda-estoque.json',
      icon: 'register',
      entries: [{ alias: 'entradasEstoque', storageKey: 'aqui-comanda:stock-entries', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'mesas',
      label: 'Mesas',
      description: 'Backup e restauração da configuração de mesas.',
      fileName: 'aqui-comanda-mesas.json',
      icon: 'table',
      entries: [{ alias: 'mesas', storageKey: 'aqui-comanda:mesas', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'comandas',
      label: 'Comandas',
      description: 'Backup e restauração das comandas e histórico operacional.',
      fileName: 'aqui-comanda-comandas.json',
      icon: 'receipt',
      entries: [{ alias: 'comandas', storageKey: 'aqui-comanda:open-comandas', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'pedidos',
      label: 'Pedidos Delivery',
      description: 'Backup e restauração dos pedidos para entrega.',
      fileName: 'aqui-comanda-pedidos.json',
      icon: 'bell',
      entries: [{ alias: 'pedidos', storageKey: 'aqui-comanda:pedidos', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'caixa',
      label: 'Caixa',
      description: 'Backup e restauração das entradas e sessões de caixa.',
      fileName: 'aqui-comanda-caixa.json',
      icon: 'dollar',
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
      icon: 'shield',
      entries: [{ alias: 'colaboradores', storageKey: 'aqui-comanda:colaboradores', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'filiais',
      label: 'Lojas / Filiais',
      description: 'Backup e restauração das unidades cadastradas.',
      fileName: 'aqui-comanda-filiais.json',
      icon: 'settings',
      entries: [{ alias: 'filiais', storageKey: 'aqui-comanda:filiais', expectedType: 'array', defaultValue: [] }],
    },
    {
      id: 'configuracoes',
      label: 'Configurações visuais',
      description: 'Backup e restauração das personalizações do sistema.',
      fileName: 'aqui-comanda-configuracoes.json',
      icon: 'settings',
      entries: [{ alias: 'uiScale', storageKey: 'aqui-comanda:ui-scale', expectedType: 'string', defaultValue: 'medium' }],
    },
    {
      id: 'ordem-menu',
      label: 'Ordem do menu',
      description: 'Backup e restauração da ordem personalizada do menu.',
      fileName: 'aqui-comanda-ordem-menu.json',
      icon: 'menu',
      entries: [{ alias: 'ordemMenu', storageKey: 'aqui-comanda:menu-order', expectedType: 'array', defaultValue: [] }],
    },
  ];

  getModules(): ImportExportModule[] {
    return this.modules.map((module) => ({ ...module, entries: module.entries.map((entry) => ({ ...entry })) }));
  }

  getModule(moduleId: string): ImportExportModule | undefined {
    return this.getModules().find((module) => module.id === moduleId);
  }

  getCollectionSummary(): ImportExportModuleSummary[] {
    return this.getModules().map((module) => ({
      module,
      recordCount: this.getRecordCount(module),
      lastUpdated: this.getLastUpdated(module),
    }));
  }

  exportModule(module: ImportExportModule): void {
    const payload = this.createExportPayload(module);
    this.downloadJson(payload, module.fileName);
  }

  exportFullBackup(): void {
    const modules = this.getModules();
    const payload = modules.reduce<Record<string, unknown>>((backup, module) => {
      backup[module.id] = this.createExportPayload(module);
      return backup;
    }, {});
    const date = new Date().toISOString().slice(0, 10);
    this.downloadJson(payload, `aqui-comanda-backup-completo-${date}.json`);
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

  validateJsonImport(module: ImportExportModule, data: unknown): ImportValidationResult {
    if (module.entries.length === 1 && module.entries[0].expectedType === 'array') {
      if (!Array.isArray(data)) {
        return { valid: false, message: 'O JSON precisa ser uma lista de registros.' };
      }

      if (data.length === 0) {
        return { valid: false, message: 'O JSON precisa conter pelo menos um registro.' };
      }
    }

    return this.validateImport(module, data);
  }

  getImportRecordCount(module: ImportExportModule, data: unknown): number {
    if (module.entries.length === 1) {
      const entry = module.entries[0];
      const value = this.isWrappedPayloadForSingleEntry(data, entry.alias) ? (data as Record<string, unknown>)[entry.alias] : data;
      return this.countValue(value);
    }

    if (!this.isRecord(data)) {
      return 0;
    }

    return module.entries.reduce((total, entry) => total + this.countValue(data[entry.alias]), 0);
  }

  getImportPreviewRows(module: ImportExportModule, data: unknown, limit = 3): string[] {
    const value =
      module.entries.length === 1 && this.isWrappedPayloadForSingleEntry(data, module.entries[0].alias)
        ? (data as Record<string, unknown>)[module.entries[0].alias]
        : data;
    const rows = Array.isArray(value) ? value : this.isRecord(value) ? Object.values(value).flat() : [];

    return rows.slice(0, limit).map((item) => this.summarizePreviewItem(item));
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

  validateFullBackup(data: unknown): ImportValidationResult {
    if (!this.isRecord(data)) {
      return { valid: false, message: 'O backup completo precisa ser um objeto JSON.' };
    }

    for (const module of this.modules) {
      if (!(module.id in data)) {
        return { valid: false, message: `O backup não contém a coleção "${module.label}".` };
      }

      const validation = this.validateImport(module, data[module.id]);

      if (!validation.valid) {
        return validation;
      }
    }

    return { valid: true };
  }

  importFullBackup(data: unknown): void {
    const validation = this.validateFullBackup(data);

    if (!validation.valid) {
      throw new Error(validation.message ?? 'Backup completo incompatível.');
    }

    const record = data as Record<string, unknown>;
    for (const module of this.modules) {
      this.importModule(module, record[module.id]);
    }
  }

  clearModule(module: ImportExportModule): void {
    for (const entry of module.entries) {
      this.writeStorageValue(entry.storageKey, entry.defaultValue);
    }
  }

  getRecordCount(module: ImportExportModule): number {
    return module.entries.reduce((total, entry) => {
      const value = this.readStorageValue(entry.storageKey, entry.defaultValue);
      return total + this.countValue(value);
    }, 0);
  }

  hasData(module: ImportExportModule): boolean {
    return this.getRecordCount(module) > 0;
  }

  private getLastUpdated(module: ImportExportModule): string | undefined {
    const timestamps = module.entries.flatMap((entry) => this.extractUpdatedDates(this.readStorageValue(entry.storageKey, entry.defaultValue)));

    if (timestamps.length === 0) {
      return undefined;
    }

    return new Date(Math.max(...timestamps.map((value) => new Date(value).getTime()))).toISOString();
  }

  private extractUpdatedDates(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractUpdatedDates(item));
    }

    if (!this.isRecord(value)) {
      return [];
    }

    const updatedValue = value['updatedAt'] ?? value['atualizadoEm'] ?? value['createdAt'] ?? value['criadoEm'] ?? value['date'];
    const dates = typeof updatedValue === 'string' && !Number.isNaN(new Date(updatedValue).getTime()) ? [updatedValue] : [];

    return [...dates, ...Object.values(value).flatMap((item) => this.extractUpdatedDates(item))];
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

  private downloadJson(payload: unknown, fileName: string): void {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
  }

  private countValue(value: unknown): number {
    if (Array.isArray(value)) {
      return value.length;
    }

    if (this.isRecord(value)) {
      return Object.keys(value).length;
    }

    return value ? 1 : 0;
  }

  private summarizePreviewItem(item: unknown): string {
    if (!this.isRecord(item)) {
      return String(item);
    }

    const preferredKeys = ['nome', 'clienteNome', 'codigo', 'numero', 'usuario', 'label', 'id'];
    const primaryKey = preferredKeys.find((key) => typeof item[key] === 'string' || typeof item[key] === 'number');

    if (primaryKey) {
      return `${primaryKey}: ${String(item[primaryKey])}`;
    }

    return Object.entries(item)
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' · ');
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
