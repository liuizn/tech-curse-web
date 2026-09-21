import { expect, test } from '@playwright/test';

const API_URL = process.env['API_URL'] ?? 'http://localhost:5130';

test.beforeAll(async ({ request }) => {
  const saude = await request.get(`${API_URL}/health/ready`).catch(() => null);
  test.skip(
    !saude?.ok(),
    `API indisponível em ${API_URL}; suba com docker-compose no repo tech-curse.`,
  );
});

test('registra um aluno, entra e vê o catálogo', async ({ page }) => {
  const email = `aluno+${Date.now()}@teste.dev`;
  const senha = 'Senha@123';

  await page.goto('/registrar');
  await page.getByLabel('Nome de usuário').fill(`aluno${Date.now()}`);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByLabel('Confirmar senha').fill(senha);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/entrar$/);

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/cursos$/);
  await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});
