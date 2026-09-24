import { expect, test } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_SENHA,
  API_URL,
  apiDisponivel,
  criarCurso,
  entrarComoAdmin,
} from './apoio/api';

test.beforeAll(async ({ request }) => {
  test.skip(
    !(await apiDisponivel(request)),
    `API indisponível em ${API_URL}; suba a API do repo tech-curse.`,
  );
  test.skip(
    !ADMIN_EMAIL || !ADMIN_SENHA,
    'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_SENHA com as credenciais do Admin semeado (Seed:Admin:*) da API.',
  );
});

test('aluno se registra, se matricula, vê seus cursos, edita o perfil e vê pagamentos', async ({
  page,
  request,
}) => {
  const curso = await criarCurso(request, await entrarComoAdmin(request));
  const sufixo = Date.now();
  const email = `aluno.portal+${sufixo}@teste.dev`;
  const senha = 'Senha@123';

  await page.goto('/registrar');
  await page.getByLabel('Nome de usuário').fill(`alunoportal${sufixo}`);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByLabel('Confirmar senha').fill(senha);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/entrar$/, { timeout: 15_000 });

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/cursos$/);

  await page.goto(`/cursos/${curso.id}`);
  await expect(page.getByRole('heading', { name: curso.titulo })).toBeVisible();
  await page.getByRole('button', { name: 'Matricular-me' }).click();
  await expect(page.getByText('Matrícula realizada')).toBeVisible();
  await expect(page.getByText('Você está matriculado')).toBeVisible();

  await page.getByRole('link', { name: 'Meus cursos' }).first().click();
  await expect(page).toHaveURL(/\/aluno\/matriculas$/);
  await expect(page.getByRole('link', { name: curso.titulo })).toBeVisible();

  await page.goto('/aluno/perfil');
  await page.getByLabel('Nome').fill(`Aluno Portal ${sufixo}`);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Perfil atualizado')).toBeVisible();

  await page.goto('/aluno/pagamentos');
  await expect(page.getByText('Nenhum pagamento registrado.')).toBeVisible();
});
