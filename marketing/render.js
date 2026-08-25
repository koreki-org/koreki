/**
 * Koreki Marketing Renderer
 * -------------------------------------------------------------------------
 * Rendert jede .html in diesem Ordner pixelgenau nach ./out/<name>.png.
 *
 * Das Ausgabeformat steht im <body data-format="...">; die Groessen unten
 * muessen mit den Regeln in brand.css uebereinstimmen.
 *
 *   node render.js              # alles rendern
 *   node render.js demo         # nur Dateien, deren Name "demo" enthaelt
 *
 * Playwright kommt aus den devDependencies des Projekts (playwright.config.ts).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Breite/Hoehe sind die CSS-Masse aus brand.css. `scale` verdoppelt die
 * Pixeldichte beim Export, ohne das Layout anzufassen — noetig, wo die
 * Plattform das Bild auf HiDPI-Displays groesser darstellt, als es ist.
 * Instagram bleibt bei 1:1, weil 1080px dort das native Ziel ist.
 */
const FORMATS = {
    feed: { width: 1080, height: 1350 },
    square: { width: 1080, height: 1080 },
    story: { width: 1080, height: 1920 },
    linkedin: { width: 1200, height: 1500, scale: 2 },
    'linkedin-cover': { width: 1584, height: 396, scale: 2 },
    youtube: { width: 1280, height: 720, scale: 2 }
};

const DIR = __dirname;
const OUT = path.join(DIR, 'out');

/** Liest data-format aus dem Quelltext — der Viewport muss vor dem Laden stehen. */
function readFormat(file) {
    const html = fs.readFileSync(file, 'utf8');
    const match = html.match(/<body[^>]*data-format="([a-z-]+)"/i);
    const name = match ? match[1] : 'feed';
    if (!FORMATS[name]) throw new Error(`Unbekanntes Format "${name}" in ${path.basename(file)}`);
    return { name, ...FORMATS[name] };
}

(async () => {
    const filter = process.argv[2];
    const files = fs.readdirSync(DIR)
        .filter((f) => f.endsWith('.html'))
        .filter((f) => !filter || f.includes(filter))
        .sort();

    if (files.length === 0) {
        console.error(filter ? `Keine .html passend zu "${filter}".` : 'Keine .html gefunden.');
        process.exit(1);
    }

    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();

    for (const file of files) {
        const src = path.join(DIR, file);
        const format = readFormat(src);

        const scale = format.scale || 1;
        const page = await browser.newPage({
            viewport: { width: format.width, height: format.height },
            deviceScaleFactor: scale
        });

        await page.goto('file:///' + src.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
        // Ohne dieses Warten rendert Chromium gelegentlich noch im Fallback-Font.
        await page.evaluate(() => document.fonts.ready);

        const target = path.join(OUT, file.replace(/\.html$/, '.png'));
        await page.screenshot({ path: target });
        await page.close();

        const kb = Math.round(fs.statSync(target).size / 1024);
        const px = `${format.width * scale}x${format.height * scale}`;
        console.log(`  ${file.padEnd(26)} ${format.name.padEnd(15)} ${px.padEnd(11)} ${scale > 1 ? `@${scale}x ` : '     '}${kb} KB`);
    }

    await browser.close();
    console.log(`\n${files.length} Grafik(en) in ${path.relative(process.cwd(), OUT)}`);
})();
