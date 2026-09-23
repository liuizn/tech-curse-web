import { TestBed } from '@angular/core/testing';
import { TemaService, CHAVE_TEMA } from './tema.service';

describe('TemaService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.resetTestingModule();
  });

  it('usa a preferência gravada em localStorage', () => {
    localStorage.setItem(CHAVE_TEMA, 'escuro');
    const servico = TestBed.inject(TemaService);
    TestBed.tick();
    expect(servico.escuro()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('alternar troca a classe dark e persiste', () => {
    localStorage.setItem(CHAVE_TEMA, 'claro');
    const servico = TestBed.inject(TemaService);
    TestBed.tick();
    servico.alternar();
    TestBed.tick();
    expect(servico.escuro()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro');
  });
});
