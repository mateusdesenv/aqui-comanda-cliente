import { Component, inject, signal } from '@angular/core';
import { IconComponent } from '../components/icon.component';
import { ConfirmationModalComponent } from '../components/confirmation-modal.component';
import { AuthService } from '../services/auth.service';
import { MenuOrderService, NavigationMenuItem } from '../services/menu-order.service';

@Component({
  selector: 'app-ordem-menu-page',
  standalone: true,
  imports: [IconComponent, ConfirmationModalComponent],
  template: `
    <div class="page-stack settings-page">
      <section class="page-head">
        <div>
          <h1>Ordem do menu</h1>
          <p>Arraste os itens para definir a ordem de exibição no menu de navegação.</p>
        </div>
      </section>

      <section class="settings-card" aria-labelledby="menu-order-title">
        <div class="settings-card-head">
          <div>
            <h2 id="menu-order-title">Itens principais do menu</h2>
            <p>Organize os itens principais. Subitens, como os de Configurações, permanecem agrupados dentro do item pai.</p>
          </div>
          <span class="settings-current-badge">
            {{ canConfigureMenu() ? 'Editável' : 'Somente leitura' }}
          </span>
        </div>

        <div class="menu-order-list" role="list" aria-label="Ordem dos itens principais do menu">
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
                <small>{{ getItemDescription(item) }}</small>
              </span>

              @if (item.badge) {
                <span class="menu-order-badge">{{ item.badge }}</span>
              }

              @if (item.children?.length) {
                <span class="menu-order-badge">Grupo</span>
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

      @if (restoreConfirmationOpen()) {
        <app-confirmation-modal
          title="Restaurar ordem padrão?"
          description="Essa ação vai desfazer a ordem personalizada do menu e restaurar a organização original do sistema."
          confirmLabel="Restaurar padrão"
          cancelLabel="Cancelar"
          (confirm)="confirmRestoreDefaultOrder()"
          (cancel)="cancelRestoreDefaultOrder()"
        />
      }
    </div>
  `,
})
export class OrdemMenuPageComponent {
  private readonly authService = inject(AuthService);
  private readonly menuOrderService = inject(MenuOrderService);

  protected readonly menuItems = signal<NavigationMenuItem[]>(this.getConfigurableMenuItems());
  protected readonly draggingIndex = signal<number | null>(null);
  protected readonly dragOverIndex = signal<number | null>(null);
  protected readonly menuOrderMessage = signal('');
  protected readonly restoreConfirmationOpen = signal(false);

  protected canConfigureMenu(): boolean {
    return this.authService.canWrite('configuracoes');
  }

  protected getItemDescription(item: NavigationMenuItem): string {
    if (item.children?.length) {
      return item.children.map((child) => child.label).join(' · ');
    }

    return item.path ?? 'Agrupador';
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

    this.menuOrderMessage.set('');
    this.restoreConfirmationOpen.set(true);
  }

  protected cancelRestoreDefaultOrder(): void {
    this.restoreConfirmationOpen.set(false);
  }

  protected confirmRestoreDefaultOrder(): void {
    if (!this.canConfigureMenu()) {
      return;
    }

    this.menuOrderService.restoreDefaultOrder();
    this.menuItems.set(this.getConfigurableMenuItems());
    this.restoreConfirmationOpen.set(false);
    this.menuOrderMessage.set('Ordem padrão restaurada.');
  }

  private getConfigurableMenuItems(): NavigationMenuItem[] {
    return this.menuOrderService.getOrderedMenuItems().filter((item) => this.authService.canRead(item.tela));
  }
}
