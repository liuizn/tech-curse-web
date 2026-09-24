import { CurrencyPipe, DatePipe } from '@angular/common';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';

describe('appConfig', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: appConfig.providers }));

  it('usa locale pt-BR e moeda BRL', () => {
    expect(TestBed.inject(LOCALE_ID)).toBe('pt-BR');
    expect(TestBed.inject(DEFAULT_CURRENCY_CODE)).toBe('BRL');
  });

  it('formata moeda e data no padrão brasileiro', () => {
    const moeda = new CurrencyPipe('pt-BR', 'BRL').transform(1234.5);
    expect(moeda).toContain('R$');
    expect(moeda).toContain('1.234,50');
    expect(new DatePipe('pt-BR').transform('2026-09-23T12:00:00Z', 'dd/MM/yyyy', 'UTC')).toBe(
      '23/09/2026',
    );
  });
});
