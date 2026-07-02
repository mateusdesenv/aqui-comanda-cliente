import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  template: `
    <div class="comanda-modal-overlay confirmation-modal-overlay" role="presentation">
      <section class="system-confirmation-modal" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
        <button class="modal-close-button" type="button" [attr.aria-label]="cancelLabel" (click)="cancel.emit()">
          X
        </button>

        <header class="system-confirmation-head">
          <span class="system-confirmation-icon" aria-hidden="true">!</span>
          <div>
            <h2 [id]="titleId">{{ title }}</h2>
            <p>{{ description }}</p>
          </div>
        </header>

        <div class="system-confirmation-actions">
          <button class="ghost-button" type="button" (click)="cancel.emit()">
            {{ cancelLabel }}
          </button>
          <button class="primary-action-button" type="button" [class.danger-confirm]="danger" (click)="confirm.emit()">
            {{ confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  `,
})
export class ConfirmationModalComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Input() danger = false;
  @Input() titleId = `confirmation-title-${Math.random().toString(16).slice(2)}`;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
