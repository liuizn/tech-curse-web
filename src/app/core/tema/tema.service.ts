import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export const CHAVE_TEMA = 'tech-curse.tema';

type Tema = 'claro' | 'escuro';

function lerPreferencia(): Tema {
  try {
    const gravado = localStorage.getItem(CHAVE_TEMA);
    if (gravado === 'claro' || gravado === 'escuro') return gravado;
  } catch {
    /* localStorage indisponível */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private readonly tema = signal<Tema>(lerPreferencia());

  readonly escuro = computed(() => this.tema() === 'escuro');

  constructor() {
    effect(() => {
      const escuro = this.tema() === 'escuro';
      this.documento.documentElement.classList.toggle('dark', escuro);
      try {
        localStorage.setItem(CHAVE_TEMA, this.tema());
      } catch {
        /* localStorage indisponível */
      }
    });
  }

  alternar(): void {
    this.tema.update((atual) => (atual === 'escuro' ? 'claro' : 'escuro'));
  }
}
