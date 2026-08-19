import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Koreki Golden Thread (Zone B) - Full Suite', () => {
    test.setTimeout(400000);
    // Industrial-grade directory for screenshots inside the reports folder
    const screenshotDir = path.resolve(process.cwd(), 'tests', 'reports', 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    /**
     * STILLGELEGT AM 19.08.2026 — dieser Test belegt nichts.
     *
     * Drei Gruende, jeder fuer sich ausreichend:
     *
     * 1. Er lief gegen die PRODUKTION (`baseURL: https://koreki.org`) und
     *    begann mit einem Aufraeumschritt, der jeden gefundenen
     *    "Loeschen"-Knopf klickte und bestaetigte — auf dem echten Konto. Der
     *    Block ist entfernt; hier stand er.
     *
     * 2. Sieben Schritte sind bedingt (`if (sichtbar) { ... } else { weiter }`).
     *    Findet er den Bilderkennungs-Knopf nicht, ueberspringt er die
     *    Bilderkennung — und ist gruen. Ein Test, der gruen sein kann, waehrend
     *    der geprueste Schritt gar nicht stattfand, ist schlimmer als keiner:
     *    Er gibt Sicherheit vor.
     *
     * 3. `click({ force: true })` umgeht Playwrights Pruefung, ob ein Element
     *    ueberhaupt klickbar ist. Ein von einem Overlay verdeckter Knopf wird
     *    trotzdem "geklickt" — die Oberflaeche kann kaputt sein, ohne dass es
     *    auffaellt. Dazu feste Wartezeiten statt Zustandspruefung.
     *
     * Er bleibt als Beschreibung der Nutzerreise stehen, bis der Ersatz gegen
     * einen LOKALEN Dev-Server steht — deterministisch, ohne Credits, und mit
     * gestubbtem KI-Anbieter, damit auch die boesen Antworten pruefbar sind.
     *
     * ACHTUNG: Die Skill `layer3-smoke` zeigt auf diesen Test und laeuft damit
     * ins Leere, bis der Ersatz da ist.
     */
    test.skip('should perform full correction workflow from upload to final result', async ({ page }) => {
        // --- 1. Dashboard Access & Reset ---
        await page.goto('https://koreki.org/app');
        await page.waitForTimeout(3000); // Let React fully hydrate
        console.log('Page loaded.');

        // Close ANY modal/overlay that might be blocking (onboarding, welcome, etc.)
        for (const closeText of ['Verstanden', 'Schließen', 'OK', 'Los geht']) {
            const btn = page.getByRole('button', { name: new RegExp(closeText, 'i') }).first();
            if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
                console.log(`Closing modal with: ${closeText}`);
                await btn.click({ force: true });
                await page.waitForTimeout(500);
            }
        }
        const dialogClose = page.locator('[role="dialog"] button, .modal button').filter({ hasText: /×|✕|close/i }).first();
        if (await dialogClose.isVisible({ timeout: 500 }).catch(() => false)) {
            await dialogClose.click({ force: true });
        }
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: path.join(screenshotDir, '00_dashboard_start.png'), fullPage: true });


        // --- 2. Musterlösung Upload ---
        console.log('Uploading Musterlösung (via setInputFiles)...');
        const musterPath = path.join(process.cwd(), 'tests', 'fixtures', 'musterloesung.pdf');
        // PINPOINT SELECTOR: Target the file input specifically within the Musterlösung Card
        const musterSelector = 'div[class*="rounded"]:has(h3:has-text("Musterlösung")) input[type="file"]';
        await page.setInputFiles(musterSelector, musterPath);

        // Handle ModelTypeModal (Select "Digitaler Text / PDF")
        const digitalOption = page.getByRole('heading', { name: /Digitaler Text \/ PDF/i }).first();
        if (await digitalOption.isVisible({ timeout: 8000 }).catch(() => false)) {
            console.log('Handling ModelTypeModal...');
            await digitalOption.click();
            await page.waitForTimeout(1000);
        }
        
        // Analysis starts automatically - wait for task structure
        console.log('Waiting for Musterlösung analysis...');
        await expect(page.getByText(/AUFGABENSTRUKTUR|Aufgabe 1/i).first()).toBeVisible({ timeout: 90000 });
        await page.screenshot({ path: path.join(screenshotDir, '01_muster_done.png'), fullPage: true });

        // --- 3. Schülerlösung Upload ---
        console.log('Uploading Schülerlösung (via setInputFiles)...');
        const studentPath = path.join(process.cwd(), 'tests/fixtures/schuelerloesung.pdf');
        // PINPOINT SELECTOR: Target the file input specifically within the Schülerarbeiten Card
        const studentSelector = 'div[class*="rounded"]:has(h3:has-text("Schülerarbeiten")) input[type="file"]';
        await page.setInputFiles(studentSelector, studentPath);

        // Handle PDFTypeModal if it appears (Wait longer for it to close)
        const typeSelectBtn = page.getByRole('button', { name: /Digital \/ Getippt/i }).first();
        if (await typeSelectBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
            console.log('Handling PDFTypeModal...');
            await typeSelectBtn.click();
            await page.waitForTimeout(2000); // Wait for modal to disappear
        }

        // Analysis starts automatically - wait for student record
        console.log('Waiting for Schülerlösung processing...');
        await expect(page.getByText(/Schüler #1/i).first()).toBeVisible({ timeout: 60000 });
        await page.screenshot({ path: path.join(screenshotDir, '02_schueler_done.png'), fullPage: true });

        // --- 4. Bilderkennung (OCR/Preprocessing) ---
        console.log('Checking if Bilderkennung is needed...');
        await page.waitForTimeout(3000); 
        const ocrBtn = page.getByRole('button').filter({ hasText: /Bilderkennung/ }).first();
        if (await ocrBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('Starting Bilderkennung...');
            await ocrBtn.click({ force: true });
            
            const ocrConfirm = page.locator('button').filter({ hasText: /Bestätigen|Starten/i }).first();
            await ocrConfirm.waitFor({ state: 'visible', timeout: 15000 });
            await ocrConfirm.click({ force: true });
        } else {
            console.log('Bilderkennung not needed (Digital Mode) or already completed.');
        }
        
        // --- 5. Korrigieren (KI-Korrektur) ---
        console.log('Starting KI-Korrektur...');
        const corrBtn = page.getByRole('button').filter({ hasText: /Korrigieren/i }).first();
        await expect(corrBtn).toBeEnabled({ timeout: 180000 }); 
        
        // Robust click with retry Loop if modal doesn't appear
        let modalVisible = false;
        for (let i = 0; i < 3; i++) {
            await corrBtn.click({ force: true });
            await page.waitForTimeout(1000);
            if (await page.locator('button').filter({ hasText: /Bestätigen|Starten/i }).first().isVisible({ timeout: 2000 }).catch(() => false)) {
                modalVisible = true;
                break;
            }
            console.log(`Retry clicking Korrigieren... (attempt ${i+1})`);
        }

        console.log('Waiting for Confirmation Modal...');
        const corrConfirm = page.locator('button').filter({ hasText: /Bestätigen|Starten/i }).first();
        await expect(corrConfirm).toBeVisible({ timeout: 45000 });
        await corrConfirm.click({ force: true });
        
        console.log('Waiting for final correction status (up to 4 minutes for AI)...');
        const finalStatus = page.getByRole('button', { name: /Alle korrigiert/i }).first();
        await expect(finalStatus).toBeVisible({ timeout: 240000 });
        
        // ZUSÄTZLICHER CHECK: Warte bis die Ergebnis-Badge (Bewertung) im Schüler-Eintrag erscheint
        await expect(page.getByText(/\d,\d/).first()).toBeVisible({ timeout: 60000 });
        await page.waitForTimeout(2000); 
        
        await page.screenshot({ path: path.join(screenshotDir, '04_final_korrektur.png'), fullPage: true });
        console.log('--- Golden Thread FULL: Completed ---');
    });
});
