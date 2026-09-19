import { decodificarPayload, extrairUsuario } from './jwt';

function montarToken(payload: object): string {
  const b64 = (v: string) => btoa(v).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify(payload))}.assinatura`;
}

describe('jwt', () => {
  it('decodifica o payload em base64url', () => {
    const token = montarToken({ sub: '1', email: 'a@b.com' });
    expect(decodificarPayload(token)).toEqual({ sub: '1', email: 'a@b.com' });
  });

  it('retorna null para token malformado', () => {
    expect(decodificarPayload('abc')).toBeNull();
    expect(decodificarPayload('a.%%%.c')).toBeNull();
  });

  it('extrai usuário das claims curtas', () => {
    const token = montarToken({ nameid: '42', email: 'aluno@teste.dev', role: 'Student' });
    expect(extrairUsuario(token)).toEqual({ id: '42', email: 'aluno@teste.dev', role: 'Student' });
  });

  it('extrai usuário das claims longas e aceita role em array', () => {
    const token = montarToken({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '7',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'adm@teste.dev',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Admin'],
    });
    expect(extrairUsuario(token)).toEqual({ id: '7', email: 'adm@teste.dev', role: 'Admin' });
  });

  it('retorna null quando a role é desconhecida', () => {
    const token = montarToken({ nameid: '1', email: 'x@y.z', role: 'Outra' });
    expect(extrairUsuario(token)).toBeNull();
  });
});
