import { FormControl, FormGroup } from '@angular/forms';
import { nomeUsuarioValidator, senhaForteValidator, senhasIguaisValidator } from './validadores';

describe('validadores', () => {
  it('senhaForte exige 8+ chars, dígito, maiúscula, minúscula e símbolo', () => {
    expect(senhaForteValidator(new FormControl('Senha@123'))).toBeNull();
    expect(senhaForteValidator(new FormControl('senha@123'))).toEqual({ senhaForte: true });
    expect(senhaForteValidator(new FormControl('Senha123'))).toEqual({ senhaForte: true });
    expect(senhaForteValidator(new FormControl('Se@1'))).toEqual({ senhaForte: true });
  });

  it('nomeUsuario aceita só letras, números e -._@+', () => {
    expect(nomeUsuarioValidator(new FormControl('joao.silva'))).toBeNull();
    expect(nomeUsuarioValidator(new FormControl('joao silva'))).toEqual({ nomeUsuario: true });
  });

  it('senhasIguais compara senha e confirmação', () => {
    const grupo = new FormGroup(
      { senha: new FormControl('a'), confirmacaoSenha: new FormControl('b') },
      { validators: [senhasIguaisValidator] },
    );
    expect(grupo.errors).toEqual({ senhasDiferentes: true });
    grupo.controls.confirmacaoSenha.setValue('a');
    expect(grupo.errors).toBeNull();
  });
});
