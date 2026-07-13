import { Injectable, computed, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiBackedState } from '../core/api/api-backed-state';
import { ApiClientService } from '../core/api/api-client.service';
import { mapApiEntity, mapApiList } from '../core/api/api-mappers';
import { ProductCategory, ProdutoCategoria, defaultProductCategories } from '../models/app-data';

export interface ProdutoCategoriaPayload {
  titulo: ProductCategory;
  icone: string;
  imagem?: string;
}

@Injectable({ providedIn: 'root' })
export class ProdutoCategoriasService extends ApiBackedState {
  private readonly api = inject(ApiClientService);
  readonly categorias = signal<ProdutoCategoria[]>([...defaultProductCategories]);
  readonly categoryTitles = computed(() => this.categorias().map((category) => category.titulo));

  getCategorias(): ProdutoCategoria[] {
    return this.categorias();
  }

  getCategoryTitles(): ProductCategory[] {
    return this.categoryTitles();
  }

  clearData(): void {
    super.clearLoadState();
    this.categorias.set([...defaultProductCategories]);
  }

  createCategoria(payload: ProdutoCategoriaPayload): ProdutoCategoria {
    const now = new Date().toISOString();
    const categoria: ProdutoCategoria = {
      ...payload,
      id: this.createId(),
      createdAt: now,
      updatedAt: now,
    };

    this.categorias.set(this.sortCategorias([...this.categorias(), categoria]));
    void lastValueFrom(this.api.post<ProdutoCategoria>('/produto-categorias', payload)).then((created) => {
      this.categorias.set(this.sortCategorias([...this.categorias().filter((item) => item.id !== categoria.id), this.mapCategoria(created)]));
    }).catch(() => this.reload().catch(() => undefined));
    return categoria;
  }

  updateCategoria(id: string, payload: ProdutoCategoriaPayload): ProdutoCategoria | null {
    const updatedAt = new Date().toISOString();
    let updatedCategoria: ProdutoCategoria | null = null;

    this.categorias.set(
      this.sortCategorias(
        this.categorias().map((categoria) => {
          if (categoria.id !== id) {
            return categoria;
          }

          updatedCategoria = { ...categoria, ...payload, updatedAt };
          return updatedCategoria;
        }),
      ),
    );

    void lastValueFrom(this.api.put<ProdutoCategoria>(`/produto-categorias/${id}`, payload)).then((updated) => {
      this.categorias.set(this.sortCategorias(this.categorias().map((categoria) => (categoria.id === id ? this.mapCategoria(updated) : categoria))));
    }).catch(() => this.reload().catch(() => undefined));
    return updatedCategoria;
  }

  deleteCategoria(id: string): void {
    this.categorias.set(this.categorias().filter((categoria) => categoria.id !== id));
    void lastValueFrom(this.api.delete(`/produto-categorias/${id}`)).catch(() => this.reload().catch(() => undefined));
  }

  private createId(): string {
    return `categoria-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private sortCategorias(categorias: ProdutoCategoria[]): ProdutoCategoria[] {
    return [...categorias].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  }

  private mapCategoria(categoria: ProdutoCategoria): ProdutoCategoria {
    const mapped = mapApiEntity(categoria);
    return {
      ...mapped,
      titulo: String(mapped.titulo ?? '').trim(),
      icone: String(mapped.icone ?? 'cards').trim() || 'cards',
      imagem: String(mapped.imagem ?? '').trim(),
    };
  }

  protected override async loadFromApi(): Promise<void> {
    const categorias = await lastValueFrom(this.api.listAll<ProdutoCategoria>('/produto-categorias'));
    const normalizedCategorias = mapApiList(categorias).map((categoria) => this.mapCategoria(categoria));
    this.categorias.set(this.sortCategorias(normalizedCategorias.length ? normalizedCategorias : defaultProductCategories));
  }
}
