import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * STILLGELEGT AM 19.08.2026.
 *
 * Eine Debug-Restdatei — der Name sagt es selbst. Sie laedt eine Datei nach
 * PRODUKTION (koreki.org) hoch, um zu sehen, ob React ein onChange ausloest.
 * Als Test belegt sie nichts, als Werkzeug gehoert sie nicht ins Repo.
 *
 * Nicht geloescht, weil das eine Entscheidung des Betreibers ist — aber
 * stillgelegt, damit `npm run test:e2e` nicht ungefragt in die Produktion
 * schreibt.
 */
test.skip('DEBUG: Test file upload triggers React onChange', async ({ page }) => {
    await page.goto('https://koreki.org/app');
    await page.waitForTimeout(5000);

    const musterPath = path.join(process.cwd(), 'tests', 'fixtures', 'musterloesung.pdf');
    const musterBuffer = fs.readFileSync(musterPath);
    // UPDATE: Adjusted selector to handle expanded accept attribute
    const sel = 'input[type="file"][accept*=".pdf"]';

    const musterSelector = 'div[class*="rounded"]:has(h3:has-text("Musterlösung")) input[type="file"]';
    console.log('Attempting setInputFiles on specific card selector...');
    await page.setInputFiles(musterSelector, musterPath);

    console.log('Events dispatched. Checking for modal...');
    
    // NEW: Handle ModelTypeModal if it appears (Select "Digitaler Text / PDF")
    const digitalOption = page.getByRole('heading', { name: /Digitaler Text \/ PDF/i }).first();
    if (await digitalOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Handling ModelTypeModal...');
        await digitalOption.click();
        await page.waitForTimeout(1000);
    }

    await page.waitForTimeout(2000);

    // Check what appeared - take screenshot
    await page.screenshot({ path: path.join(process.cwd(), 'test-results/screenshots/debug_after_upload.png'), fullPage: true });

    // Check for the modal button
    const modalBtn = page.getByRole('button', { name: 'Als Musterlösung verwenden' });
    const modalVisible = await modalBtn.isVisible().catch(() => false);
    console.log(`"Als Musterlösung verwenden" button visible: ${modalVisible}`);

    // Also check for any dialog/modal
    const anyDialog = await page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').count();
    console.log(`Dialogs/Modals on page: ${anyDialog}`);

    // Log page content around modals
    const bodyText = await page.locator('body').innerText();
    console.log('Page text (first 500 chars):', bodyText.substring(0, 500));
});
