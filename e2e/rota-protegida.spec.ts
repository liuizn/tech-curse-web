import { expect, test } from '@playwright/test';

const API_URL = process.env['API_URL'] ?? 'http://localhost:5130';

test.beforeAll(async ({ request }) => {
  const saude = await request.get(`${API_URL}/health/ready`).catch(() => null);
  test.skip(
    !saude?.ok(),
    `API indisponível em ${API_URL}; suba com docker-compose no repo tech-curse.`,
  );
});

test('rota protegida redireciona para /entrar e volta após login', async ({ page, request }) => {
  const email = `aluno+${Date.now()}@teste.dev`;
  const senha = 'Senha@123';
  const registro = await request.post(`${API_URL}/tech-curse/Auth/register`, {
    data: {
      name: `aluno${Date.now()}`,
      email,
      role: 'Student',
      password: senha,
      confirmPassword: senha,
    },
  });
  expect(registro.status()).toBe(201);

  await page.goto('/cursos');
  await expect(page).toHaveURL(/\/entrar\?returnUrl=%2Fcursos$/, { timeout: 15_000 });

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/cursos$/);
});
