import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-construction-page',
  standalone: true,
  template: `
    <div class="page-stack construction-page">
      <section class="page-head">
        <div>
          <h1>{{ title }}</h1>
          <p>Essa área ainda será implementada no sistema.</p>
        </div>
      </section>

      <section class="construction-card">
        <span>Em construção</span>
      </section>
    </div>
  `,
})
export class ConstructionPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = this.route.snapshot.data['title'] ?? 'Área';
}
