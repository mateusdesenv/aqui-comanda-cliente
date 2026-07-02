import { Component, inject, signal } from '@angular/core';
import { IconComponent } from '../components/icon.component';
import { TelaSistema } from '../models/app-data';
import { AuthService } from '../services/auth.service';
import { MenuOrderService, NavigationMenuItem } from '../services/menu-order.service';
import { UiScale, UiSettingsService } from '../services/ui-settings.service';

interface ScaleOption {
  value: UiScale;
  label: string;
  description: string;
  preview: string;
}

@Component({
  selector: 'app-configuracoes-page',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="page-stack settings-page">
      <section class="page-head">
        <div>
          <h1>Configurações</h1>
          <p>Ajuste a experiência visual do sistema para facilitar a operação no dia a dia.</p>
        </div>
      </section>

      <section class="settings-card" aria-labelledby="ui-scale-title">
        <div class="settings-card-head">
          <div>
            <h2 id="ui-scale-title">Tamanho da interface</h2>
            <p>Escolha uma escala visual mais confortável para leitura, toque e operação.</p>
          </div>
          <span class="settings-current-badge">
            Atual: {{ uiSettings.getScaleLabel(currentScale()) }}
          </span>
        </div>

        <div class="scale-options" role="radiogroup" aria-label="Tamanho da interface">
          @for (option of scaleOptions; track option.value) {
            <button
              type="button"
              class="scale-option-card"
              [class.active]="currentScale() === option.value"
              role="radio"
              [attr.aria-checked]="currentScale() === option.value"
              (click)="setScale(option.value)"
            >
              <span class="scale-check" aria-hidden="true">
                {{ currentScale() === option.value ? '✓' : '' }}
              </span>

              <span class="scale-option-content">
                <strong>{{ option.label }}</strong>
                <small>{{ option.description }}</small>
              </span>

              <span class="scale-preview" aria-hidden="true">
                <span class="scale-preview-title">{{ option.preview }}</span>
                <span class="scale-preview-line"></span>
                <span class="scale-preview-button">Botão</span>
              </span>
            </button>
          }
        </div>

        <div class="settings-applied-message">
          Configuração aplicada automaticamente.
        </div>
      </section>

      <section class="settings-card" aria-labelledby="menu-order-title">
        <div class="settings-card-head">
          <div>
            <h2 id="menu-order-title">Ordem do menu</h2>
            <p>Arraste os itens para definir a ordem de exibição no menu de navegação.</p>
          </div>
          <span class="settings-current-badge">
            {{ canConfigureMenu() ? 'Editável' : 'Somente leitura' }}
          </span>
        </div>

        <div class="menu-order-list" role="list" aria-label="Ordem dos itens do menu">
          @for (item of menuItems(); track item.id; let index = $index) {
            <div
              role="listitem"
              class="menu-order-item"
              [class.dragging]="draggingIndex() === index"
              [class.drag-over]="dragOverIndex() === index && draggingIndex() !== index"
              [class.readonly]="!canConfigureMenu()"
              [draggable]="canConfigureMenu()"
              (dragstart)="onDragStart($event, index)"
              (dragover)="onDragOver($event, index)"
              (dragleave)="onDragLeave(index)"
              (drop)="onDrop($event, index)"
              (dragend)="onDragEnd()"
            >
              <span class="menu-order-grip" aria-hidden="true">⋮⋮</span>

              <span class="menu-order-icon">
                <app-icon [name]="item.icon" [size]="22" />
              </span>

              <span class="menu-order-content">
                <strong>{{ item.label }}</strong>
                <small>{{ item.path }}</small>
              </span>

              @if (item.badge) {
                <span class="menu-order-badge">{{ item.badge }}</span>
              }

              @if (canConfigureMenu()) {
                <span class="menu-order-position">{{ index + 1 }}</span>
              }
            </div>
          }
        </div>

        <div class="menu-order-actions">
          <button type="button" class="secondary-button" [disabled]="!canConfigureMenu()" (click)="restoreDefaultOrder()">
            Restaurar padrão
          </button>
          <button type="button" class="primary-button" [disabled]="!canConfigureMenu()" (click)="saveMenuOrder()">
            Salvar ordem
          </button>
        </div>

        @if (menuOrderMessage()) {
          <div class="settings-applied-message">
            {{ menuOrderMessage() }}
          </div>
        }
      </section>
    </div>
  `,
})
export class ConfiguracoesPageComponent {
  protected readonly uiSettings = inject(UiSettingsService);
  protected readonly currentScale = this.uiSettings.scale;

  private readonly authService = inject(AuthService);
  private readonly menuOrderService = inject(MenuOrderService);

  protected readonly menuItems = signal<NavigationMenuItem[]>(this.getConfigurableMenuItems());
  protected readonly draggingIndex = signal<number | null>(null);
  protected readonly dragOverIndex = signal<number | null>(null);
  protected readonly menuOrderMessage = signal('');

  protected readonly scaleOptions: ScaleOption[] = [
    {
      value: 'small',
      label: 'Pequeno',
      description: 'Mais compacto, ideal para telas menores e usuários acostumados com sistemas.',
      preview: 'Compacto',
    },
    {
      value: 'medium',
      label: 'Médio',
      description: 'Equilíbrio entre densidade de informação e boa leitura.',
      preview: 'Padrão',
    },
    {
      value: 'large',
      label: 'Grande',
      description: 'Elementos maiores para leitura rápida e operação mais confortável.',
      preview: 'Confortável',
    },
  ];

  protected setScale(scale: UiScale): void {
    this.uiSettings.setScale(scale);
  }

  protected canConfigureMenu(): boolean {
    return this.authService.canWrite('configuracoes');
  }

  protected onDragStart(event: DragEvent, index: number): void {
    if (!this.canConfigureMenu()) {
      event.preventDefault();
      return;
    }

    this.draggingIndex.set(index);
    this.menuOrderMessage.set('');
    event.dataTransfer?.setData('text/plain', String(index));
    event.dataTransfer?.setDragImage(event.currentTarget as Element, 24, 24);
  }

  protected onDragOver(event: DragEvent, index: number): void {
    if (!this.canConfigureMenu() || this.draggingIndex() === null) {
      return;
    }

    event.preventDefault();
    this.dragOverIndex.set(index);
  }

  protected onDragLeave(index: number): void {
    if (this.dragOverIndex() === index) {
      this.dragOverIndex.set(null);
    }
  }

  protected onDrop(event: DragEvent, targetIndex: number): void {
    if (!this.canConfigureMenu()) {
      return;
    }

    event.preventDefault();
    const sourceIndex = this.draggingIndex();

    if (sourceIndex === null || sourceIndex === targetIndex) {
      this.onDragEnd();
      return;
    }

    const reorderedItems = [...this.menuItems()];
    const [movedItem] = reorderedItems.splice(sourceIndex, 1);
    reorderedItems.splice(targetIndex, 0, movedItem);
    this.menuItems.set(reorderedItems);
    this.onDragEnd();
  }

  protected onDragEnd(): void {
    this.draggingIndex.set(null);
    this.dragOverIndex.set(null);
  }

  protected saveMenuOrder(): void {
    if (!this.canConfigureMenu()) {
      return;
    }

    const visibleOrder = this.menuItems().map((item) => item.id);
    const hiddenItemsOrder = this.menuOrderService
      .getOrderedMenuItems()
      .map((item) => item.id)
      .filter((itemId) => !visibleOrder.includes(itemId));

    this.menuOrderService.saveOrder([...visibleOrder, ...hiddenItemsOrder]);
    this.menuItems.set(this.getConfigurableMenuItems());
    this.menuOrderMessage.set('Ordem do menu salva com sucesso.');
  }

  protected restoreDefaultOrder(): void {
    if (!this.canConfigureMenu()) {
      return;
    }

    const shouldRestore = typeof window === 'undefined' || window.confirm('Restaurar a ordem padrão do menu?');

    if (!shouldRestore) {
      return;
    }

    this.menuOrderService.restoreDefaultOrder();
    this.menuItems.set(this.getConfigurableMenuItems());
    this.menuOrderMessage.set('Ordem padrão restaurada.');
  }

  private getConfigurableMenuItems(): NavigationMenuItem[] {
    return this.menuOrderService.getOrderedMenuItems().filter((item) => this.authService.canRead(item.tela));
  }
}
