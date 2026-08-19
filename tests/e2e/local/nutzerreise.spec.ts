import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Die Nutzerreise durch die Oberfläche (Layer 3)
 * 🧑‍🏫🧵
 *
 * Ersatz für den stillgelegten Golden Thread — mit den drei Änderungen, an
 * denen der alte gescheitert ist:
 *
 * 1. GEGEN DEN EIGENEN RECHNER, nicht gegen die Produktion. Der alte löschte
 *    dort Daten und verbrauchte Credits.
 * 2. KEINE BEDINGTEN SCHRITTE. Der alte übersprang Stationen, wenn er sie
 *    nicht fand, und war trotzdem grün. Hier scheitert jeder Schritt, der
 *    nicht stattfindet.
 * 3. KEIN `force: true` UND KEINE FESTEN WARTEZEITEN. Playwright prüft die
 *    Klickbarkeit; gewartet wird auf Zustände, nicht auf Sekunden
 *    (`playwright-pro` §2).
 *
 * Der KI-Anbieter ist der Stub aus `stub-provider.mjs` — die Korrektur läuft
 * also durch, ohne ein echtes Modell zu fragen, und der Test bestimmt, was
 * herauskommt.
 *
 * WAS DIESER TEST PRÜFT, DEN LAYER 2 NICHT PRÜFT
 * -----------------------------------------------
 * `korrektur-kette.spec.ts` prüft dieselbe Rechnung auf HTTP-Ebene. Hier geht
 * es um das, was nur die Oberfläche beantworten kann: Kommt der Upload an,
 * lässt sich die Korrektur auslösen, und erscheint die Note dort, wo die
 * Lehrkraft sie liest.
 */

const STUB = 'http://localhost:4010';
const FIXTURES = path.resolve(process.cwd(), 'tests', 'fixtures');

/**
 * Der lokale Stand nutzt standardmäßig Mistral. Für den Test wird der
 * Anbieter auf den Stub gestellt — im lokalen Modus liest der Zustandsspeicher
 * diese Werte beim Start aus dem localStorage.
 */
async function stelleAufStub(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('koreki_desktop_provider', 'openai-compatible');
        localStorage.setItem('koreki_openai_url', 'http://localhost:4010/v1');
        localStorage.setItem('koreki_openai_model', 'stub-modell');
    });
}

test.beforeEach(async ({ page, request }) => {
    await request.post(`${STUB}/__zuruecksetzen`);
    await stelleAufStub(page);
});

test('Musterloesung hochladen, korrigieren, Note sehen', async ({ page, request }) => {
    // --- Was das Modell antworten soll ---
    await request.post(`${STUB}/__antwort`, {
        data: {
            fuer: 'korrektur',
            inhalt: JSON.stringify({
                tasks: [{ name: 'Aufgabe 1', pointsObtained: 4, maxPoints: 5, feedback: 'Fast vollständig.' }],
                confidence: 95
            })
        }
    });

    await page.goto('/app');

    // --- 1. Musterlösung ---
    //
    // Das Eingabefeld ist versteckt (die Karte ist die Klickfläche). Für
    // `setInputFiles` ist das kein Hindernis, und es ist ehrlicher, als den
    // Umweg über die Karte zu klicken.
    await page.getByTestId('upload-musterloesung').first()
        .setInputFiles(path.join(FIXTURES, 'musterloesung.pdf'));

    // Koreki fragt nach der Dokumentart. Dieser Schritt wird BEWUSST
    // unbedingt erwartet — der alte Test behandelte ihn bedingt und
    // uebersprang damit stillschweigend die halbe Reise.
    await page.getByTestId('modelltyp-digital').click();

    // Die Struktur-Erkennung laeuft ueber das Modell — gewartet wird auf ihr
    // Ergebnis, nicht auf eine Zeitspanne.
    await expect(page.getByText(/Aufgabe 1/i).first()).toBeVisible({ timeout: 60000 });

    // --- 2. Schülerarbeit ---
    await page.getByTestId('upload-schuelerarbeit').first()
        .setInputFiles(path.join(FIXTURES, 'schuelerloesung.pdf'));

    // Auch hier: die Art des Dokuments gehoert zur Reise.
    await page.getByTestId('pdftyp-digital').click();

    // --- 3. Korrigieren ---
    const korrigieren = page.getByTestId('korrigieren');
    await expect(korrigieren).toBeEnabled({ timeout: 60000 });
    await korrigieren.click();

    // Die Datenschutz-Bestaetigung ist Pflicht — sie zu ueberspringen waere
    // genau der bedingte Schritt, der den alten Test wertlos gemacht hat.
    const bestaetigen = page.getByTestId('bestaetigen');
    await expect(bestaetigen).toBeVisible();
    await bestaetigen.click();

    // --- 4. Die Note steht da, wo die Lehrkraft sie liest ---
    const note = page.getByTestId('note').first();
    await expect(note).toBeVisible({ timeout: 90000 });

    // 4 von 5 Punkten sind 80 % — daraus wird die Note 2,0.
    await expect(note).toHaveText('2,0');
});

/**
 * NOCH NICHT GEBAUT — und das gehoert hierhin, nicht in eine Notiz.
 *
 * Der zweite Fall waere: Scheitert die Korrektur, muss man das SEHEN. Eine
 * Note aus einer gescheiterten Korrektur waere die gefaehrlichste aller
 * Anzeigen, weil sie aussieht wie ein Ergebnis.
 *
 * Der Server macht seinen Teil bereits richtig — legt man dem Modell eine
 * unlesbare Antwort in den Mund, weist er sie ab ("JSON Parse Fatal Error").
 * Was in der Liste danach erscheint, konnte ich am 19.08.2026 nicht
 * zuverlaessig festmachen: Das Fehlerzeichen (`data-testid="fehler"` in
 * BatchFileListItem) war im Testlauf nicht sichtbar, und die Ursache habe ich
 * nicht mehr eingegrenzt.
 *
 * Der Haken (`data-testid="fehler"`) bleibt gesetzt, damit der naechste Anlauf
 * dort ansetzen kann. Ein Test, der stattdessen nur prueft, dass KEINE Note da
 * ist, waere wertlos: Er bestuende auch dann, wenn ueberhaupt nichts passiert.
 */
