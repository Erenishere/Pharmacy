const { test, expect } = require('@playwright/test');

const backendBase = process.env.BACKEND_URL || 'http://127.0.0.1:3001';

async function loginAsSmokeAdmin(page) {
  await page.goto('/login');

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.locator('#identifier').fill(process.env.SMOKE_ADMIN_USERNAME || 'smoke.admin');
    await page.locator('#password').fill(process.env.SMOKE_ADMIN_PASSWORD || 'SmokePass123');
    await page.getByRole('button', { name: /sign in/i }).click();

    try {
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
      return;
    } catch (error) {
      const loginFailed = await page.locator('text=Login failed').isVisible().catch(() => false);
      if (!loginFailed || attempt === 1) {
        throw error;
      }
    }
  }
}

async function getAuthToken(page) {
  return page.evaluate(() => localStorage.getItem('auth_token'));
}

async function apiGet(page, token, path) {
  const response = await page.request.get(`${backendBase}/api/v1${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return {
    status: response.status(),
    body: await response.json(),
  };
}

test.describe('account registration browser proof', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmokeAdmin(page);
  });

  test('account registration can create and edit a workbook-style account round trip', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    const uniqueSuffix = Date.now().toString();
    const accountName = `Smoke Account ${uniqueSuffix}`;
    const updatedAccountName = `${accountName} Updated`;
    const accountCode = `SMKACC${uniqueSuffix.slice(-6)}`;

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/accounts/registration');
    await expect(page.locator('input[formcontrolname="name"]')).toBeVisible({ timeout: 20_000 });

    await page.locator('select[formcontrolname="dimensionId"]').selectOption({ label: 'Smoke Dimension' });
    await page.locator('select[formcontrolname="designationId"]').selectOption({ label: 'Smoke Designation' });
    await page.locator('select[formcontrolname="customerTypeId"]').selectOption({ label: 'Smoke Customer Type' });
    await page.locator('select[formcontrolname="accountHeadId"]').selectOption({ label: 'Smoke Account Head' });
    await page.locator('select[formcontrolname="townId"]').selectOption({ label: 'Smoke Town' });
    await page.locator('select[formcontrolname="areaId"]').selectOption({ label: 'Smoke Planned Area' });

    await page.locator('input[formcontrolname="name"]').fill(accountName);
    await page.locator('input[formcontrolname="nameUrdu"]').fill('Smoke Urdu Title');
    await page.locator('input[formcontrolname="code"]').fill(accountCode);
    await page.locator('textarea[formcontrolname="address"]').fill('Smoke Address Line');
    await page.locator('input[formcontrolname="proprietorName"]').fill('Smoke Proprietor');
    await page.locator('input[formcontrolname="proprietorWhatsapp"]').fill('03000000077');
    await page.locator('input[formcontrolname="storeInchargeName"]').fill('Smoke Store Incharge');
    await page.locator('input[formcontrolname="storeInchargeWhatsapp"]').fill('03000000078');
    await page.locator('input[formcontrolname="messageNumber"]').fill('03000000079');
    await page.locator('input[formcontrolname="creditAmountLimit"]').fill('25000');
    await page.locator('input[formcontrolname="creditDaysLimit"]').fill('21');
    await page.locator('input[formcontrolname="bankName1"]').fill('Smoke First Bank');
    await page.locator('input[formcontrolname="accountNumber1"]').fill(`AC-${uniqueSuffix}`);
    await page.locator('input[formcontrolname="branch1"]').fill('Smoke Branch');
    await page.locator('input[formcontrolname="locationPinPoint"]').fill('24.8607,67.0011');
    await page.locator('input[formcontrolname="openingBalance"]').fill('1234');
    await page.locator('input[formcontrolname="licenseNo"]').fill('LIC-SMOKE-001');
    await page.locator('input[formcontrolname="licenseExpiryDate"]').fill('2099-12-31');
    await page.locator('input[formcontrolname="strn"]').fill('STRN-SMOKE');
    await page.locator('input[formcontrolname="ntn"]').fill('NTN-SMOKE');
    await page.locator('input[formcontrolname="nicNumber"]').fill('42101-1234567-8');
    await page.locator('input[formcontrolname="srbNo"]').fill('SRB-SMOKE');
    await page.locator('input[formcontrolname="advanceWhtPercent"]').fill('2.5');
    await page.locator('input[formcontrolname="incomeTaxDeductionPercent"]').fill('1');
    await page.locator('input[formcontrolname="email"]').fill(`smoke.account.${uniqueSuffix}@example.com`);
    await page.locator('textarea[formcontrolname="notes"]').fill('Smoke browser proof note');

    await page.locator('select[formcontrolname="employeeAccountType"]').selectOption('account_manager');
    await page.locator('input[formcontrolname="fatherName"]').fill('Smoke Father');
    await page.locator('input[formcontrolname="fatherNIC"]').fill('42101-1111111-1');
    await page.locator('input[formcontrolname="dateOfAppointment"]').fill('2024-01-15');
    await page.locator('input[formcontrolname="guarantorName"]').fill('Smoke Guarantor');
    await page.locator('textarea[formcontrolname="guarantorAddress"]').fill('Smoke Guarantor Address');
    await page.locator('input[formcontrolname="guarantorPhone"]').fill('03000000080');
    await page.locator('input[formcontrolname="guarantorNIC"]').fill('42101-2222222-2');
    await page.locator('input[formcontrolname="basicPay"]').fill('45000');
    await page.locator('input[formcontrolname="experience"]').fill('5 years');
    await page.locator('select[formcontrolname="bloodGroup"]').selectOption('A+');
    await page.locator('textarea[formcontrolname="permanentAddress"]').fill('Smoke Permanent Address');
    await page.locator('input[formcontrolname="phone"]').fill('03000000081');
    await page.locator('input[formcontrolname="whatsapp"]').fill('03000000082');
    await page.locator('input[formcontrolname="taxNumber"]').fill('TAX-SMOKE-001');

    await page.getByRole('button', { name: /save account/i }).click();
    await expect(page.locator('.mat-mdc-snack-bar-container')).toContainText(/created successfully/i, { timeout: 20_000 });

    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    const createdLookup = await apiGet(page, token, `/accounts?keyword=${encodeURIComponent(accountName)}&limit=20`);
    expect(createdLookup.status).toBe(200);
    const createdAccount = (createdLookup.body.data || []).find((account) => account.name === accountName);
    expect(createdAccount).toBeTruthy();

    const createdDetails = await apiGet(page, token, `/accounts/${createdAccount._id}`);
    expect(createdDetails.status).toBe(200);
    expect(createdDetails.body.data.name).toBe(accountName);
    expect(createdDetails.body.data.contactInfo.email).toBe(`smoke.account.${uniqueSuffix}@example.com`);
    expect(createdDetails.body.data.businessDetails.creditAmountLimit).toBe(25000);
    expect(createdDetails.body.data.currentBalance).toBe(1234);

    await page.goto(`/accounts/registration/${createdAccount._id}`);
    await expect(page.locator('input[formcontrolname="name"]')).toHaveValue(accountName, { timeout: 20_000 });
    await expect(page.locator('input[formcontrolname="email"]')).toHaveValue(`smoke.account.${uniqueSuffix}@example.com`);
    await expect(page.locator('input[formcontrolname="bankName1"]')).toHaveValue('Smoke First Bank');

    await page.locator('input[formcontrolname="name"]').fill(updatedAccountName);
    await page.locator('input[formcontrolname="phone"]').fill('03000000999');
    await page.locator('input[formcontrolname="creditAmountLimit"]').fill('32000');
    await page.locator('input[formcontrolname="openingBalance"]').fill('999');
    await page.locator('input[formcontrolname="bankName1"]').fill('Smoke Updated Bank');
    await page.locator('textarea[formcontrolname="notes"]').fill('Smoke browser proof note updated');

    await page.getByRole('button', { name: /update account/i }).click();
    await expect(page.locator('.mat-mdc-snack-bar-container')).toContainText(/updated successfully/i, { timeout: 20_000 });

    const updatedDetails = await apiGet(page, token, `/accounts/${createdAccount._id}`);
    expect(updatedDetails.status).toBe(200);
    expect(updatedDetails.body.data.name).toBe(updatedAccountName);
    expect(updatedDetails.body.data.contactInfo.phone).toBe('03000000999');
    expect(updatedDetails.body.data.businessDetails.creditAmountLimit).toBe(32000);
    expect(updatedDetails.body.data.businessDetails.openingBalance).toBe(999);
    expect(updatedDetails.body.data.bankingInfo.bankName).toBe('Smoke Updated Bank');
    expect(updatedDetails.body.data.currentBalance).toBe(1234);

    await expect(page.locator('body')).not.toContainText(/coming soon|mock response|fake success/i);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((text) => text.includes('Cannot find control with name') || text.includes('ERROR TypeError') || text.includes('NG0'))).toEqual([]);
  });
});
