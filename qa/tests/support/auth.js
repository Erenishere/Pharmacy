const backendBase = process.env.BACKEND_URL || `http://127.0.0.1:${process.env.PORT || '3001'}`;

async function loginAsSmokeAdmin(page) {
  const identifier = process.env.SMOKE_ADMIN_USERNAME || 'smoke.admin';
  const password = process.env.SMOKE_ADMIN_PASSWORD || 'SmokePass123';

  const response = await page.request.post(`${backendBase}/api/v1/auth/login`, {
    data: { identifier, password }
  });

  if (!response.ok()) {
    throw new Error(`Smoke admin API login failed: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  const session = body.data;

  await page.addInitScript(({ accessToken, refreshToken, user }) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  }, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user
  });

  await page.goto('/dashboard');
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

module.exports = {
  loginAsSmokeAdmin
};
