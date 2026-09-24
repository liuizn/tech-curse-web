import { extrairErroApi } from './erro-api';

describe('extrairErroApi', () => {
  const erro = { status: 404, titulo: 'Não encontrado', detalhe: 'Sem perfil.' };

  it('aceita o ErroApi direto', () => expect(extrairErroApi(erro)).toEqual(erro));

  it('aceita o ErroApi dentro de cause', () => {
    const embrulhado = Object.assign(new Error('embrulhado'), { cause: erro });
    expect(extrairErroApi(embrulhado)).toEqual(erro);
  });

  it('devolve null para outros valores', () => {
    expect(extrairErroApi(new Error('x'))).toBeNull();
    expect(extrairErroApi(undefined)).toBeNull();
  });
});
