import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.resolve(process.cwd(), 'tests/auth/user.json');

setup('authenticate', async ({ page }) => {
    console.log('--- Auth Setup: Production Login ---');
    await page.goto('https://koreki.org/login');
    
    // Switch to Logto
    await page.getByRole('button', { name: /Mit Account anmelden/i }).click();
    
    // Wait for Logto redirect
    await page.waitForURL(/.*(logto\.app|auth\.koreki\.org).*/);
    
    // Fill credentials from environment variables
    const user = process.env.E2E_TEST_USER;
    const pass = process.env.E2E_TEST_PASSWORD;

    if (!user || !pass) {
        throw new Error('E2E_TEST_USER or E2E_TEST_PASSWORD not set in environment!');
    }

    console.log('Logging in to production...');
    const inputs = page.locator('input:not([type="hidden"])');
    await inputs.first().waitFor({ state: 'visible', timeout: 15000 });
    
    await inputs.nth(0).fill(user);
    await inputs.nth(1).fill(pass);
    await page.getByRole('button', { name: /Anmelden/i }).click();

    // Wait for redirect back
    await page.waitForURL(/.*\/app|.*\/org-admin/, { timeout: 60000 });
    
    // Industrial Robustness: Handle ANY onboarding/compliance/marketing modals
    for (const closeText of ['Verstanden', 'Schließen', 'Los geht', 'Akzeptieren', 'Annehmen']) {
        const btn = page.getByRole('button', { name: new RegExp(closeText, 'i') }).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`Closing auth-setup modal/compliance screen with: ${closeText}`);
            await btn.click({ force: true });
            await page.waitForTimeout(1000);
        }
    }

    // Verify arrival on Dashboard or Admin
    await expect(page.getByText(/Koreki|Musterlösung|Dashboard/i).first()).toBeVisible({ timeout: 15000 });
    
    // Save storage state
    await page.context().storageState({ path: authFile });
    console.log('--- Auth Setup Complete: Session persisted ---');
});
