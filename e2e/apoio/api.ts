import { APIRequestContext, expect } from '@playwright/test';

export const API_URL = process.env['API_URL'] ?? 'http://localhost:5130';
export const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'];
export const ADMIN_SENHA = process.env['E2E_ADMIN_SENHA'];

export async function apiDisponivel(request: APIRequestContext): Promise<boolean> {
  const saude = await request.get(`${API_URL}/health/ready`).catch(() => null);
  return !!saude?.ok();
}

export async function entrarComoAdmin(request: APIRequestContext): Promise<string> {
  const resposta = await request.post(`${API_URL}/tech-curse/Auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_SENHA },
  });
  expect(
    resposta.status(),
    'login do Admin semeado (confira E2E_ADMIN_EMAIL/E2E_ADMIN_SENHA)',
  ).toBe(200);
  return (await resposta.json()).accessToken as string;
}

export async function criarCurso(
  request: APIRequestContext,
  token: string,
): Promise<{ id: number; titulo: string }> {
  const titulo = `Curso E2E ${Date.now()}`;
  const resposta = await request.post(`${API_URL}/tech-curse/Course`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { titulo, descricao: 'Curso criado pelo teste E2E.', categoria: 'E2E', cargaHoraria: 8 },
  });
  expect(resposta.status()).toBe(201);
  const curso = await resposta.json();
  return { id: curso.id as number, titulo };
}
