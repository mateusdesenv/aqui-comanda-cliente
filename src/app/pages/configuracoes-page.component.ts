import { Component, inject } from '@angular/core';
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
  template: `
    <div class="page-stack settings-page">
      <section class="page-head">
        <div>
          <h1>Personalizações do sistema</h1>
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
    </div>
  `,
})
export class ConfiguracoesPageComponent {
  protected readonly uiSettings = inject(UiSettingsService);
  protected readonly currentScale = this.uiSettings.scale;

  protected readonly scaleOptions: ScaleOption[] = [
    {
      value: 'mini',
      label: 'Mini',
      description: 'Escala mais compacta, ideal para máxima densidade de informação.',
      preview: 'Mini',
    },
    {
      value: 'tiny',
      label: 'Muito pequeno',
      description: 'Compacto sem perder legibilidade em telas operacionais.',
      preview: 'Muito compacto',
    },
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
}
