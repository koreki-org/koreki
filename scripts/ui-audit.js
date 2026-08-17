const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, '..', 'src', 'pages'),
    path.join(__dirname, '..', 'src', 'components')
];

// File extension filter
const validExtensions = ['.ts', '.tsx', '.js', '.jsx'];

// List of pages that are internal app pages (excluded from marketing-only rules)
const excludedPages = [
    'src/pages/app.tsx',
    'src/pages/admin.tsx',
    'src/pages/_app.tsx',
    'src/pages/desktop.tsx',
    'src/pages/desktop-setup.tsx'
];

// List of app files that have been fully migrated to design tokens and must pass all checks
// List of app files in the grace period (not yet migrated to design tokens, warnings only)
// Dateien, deren Verstoesse als Warnung statt als Fehler gemeldet werden.
//
// Aktuell leer: die vier Graph-Reiter standen hier waehrend ihres Umzugs aus
// GradingGraphModal und sind inzwischen auf Design-Tokens umgestellt.
const gracePeriodFiles = [];


// --- Rohe Bedienelemente ---------------------------------------------------
//
// Der Style Guide verlangt: alle UI-Elemente stammen aus @/components/ui/,
// rohe <button>/<input>/<select> sind ausserhalb davon untersagt. Die Regel
// stand bisher nur im Dokument — 76 Faelle in 31 Dateien sind so entstanden,
// ohne dass es jemandem auffiel. Dasselbe Muster wie bei den Dateigroessen und
// beim Backend-Logging: eine Regel ohne Waechter driftet.
//
// src/components/ui/ ist ausgenommen — dort WRAPPT das Kit die rohen Elemente,
// das ist ihr Zweck.
//
// RATSCHE: der Ist-Stand ist eingefroren. Neue Dateien muessen sauber sein,
// Bestandsdateien duerfen nicht wachsen, und wer eine verbessert, zieht ihren
// Wert mit runter. Faellt eine auf null, muss sie aus der Liste verschwinden.
const RAW_CONTROL_BASELINE = {
    'src/components/batch/ExportToolbar.tsx': 7,
    'src/components/batch/parts/GraphEditorPanel.tsx': 7,
    'src/components/batch/GradingGraphModal.tsx': 5,
    'src/components/batch/GradingMemoryStartScreen.tsx': 5,
    'src/components/settings/AiProfileModules.tsx': 5,
    'src/components/settings/SkillsModules.tsx': 5,
    'src/components/upload/ModelSolutionCard.tsx': 5,
    'src/components/upload/ModelSolutionTaskCard.tsx': 4,
    'src/components/batch/parts/GraphAiPanel.tsx': 3,
    'src/pages/desktop-setup.tsx': 3,
    'src/components/batch/CalcTraceModal.tsx': 2,
    'src/components/batch/GradingMemoryCalibrateScreen.tsx': 2,
    'src/components/batch/parts/BatchTaskAnalysisCard.tsx': 2,
    'src/components/settings/ProfileModules.tsx': 2,
    'src/components/settings/UnifiedAiConfig.tsx': 2,
    'src/components/upload/StudentWorkCard.tsx': 2,
    'src/components/avv-upload/StepUpload.tsx': 1,
    'src/components/batch/BatchHeader.tsx': 1,
    'src/components/batch/DigitalSlipsModal.tsx': 1,
    'src/components/batch/GradingMemoryEditorView.tsx': 1,
    'src/components/batch/parts/BatchSolutionPanel.tsx': 1,
    'src/components/layout/AppHeader.tsx': 1,
    'src/components/marketing/ImageLightbox.tsx': 1,
    'src/components/PDFSplitModal.tsx': 1,
    'src/components/settings/AiProfileSidebar.tsx': 1,
    'src/components/settings/OpenAICompatibleConfig.tsx': 1,
    'src/components/settings/PrivacySection.tsx': 1,
    'src/components/settings/SkillsSidebar.tsx': 1,
    'src/pages/features.tsx': 1,
    'src/pages/view.tsx': 1
};

const RAW_CONTROL_PATTERN = /<(?:input|button|select)\b/g;

// 21 Tailwind Color Families
const colorFamilies = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

// Brand and Neutral Color Families that must be tokenized in the app
const brandAndNeutralColors = 'slate|gray|zinc|neutral|stone|blue|indigo|violet|purple|fuchsia|pink|amber|emerald|green|red|rose';

// Shared structural/layout checks (apply to all UI files)
const sharedChecks = [
    {
        // Allow rounded-[var(--...)] CSS variables
        regex: /rounded-\[(?!var\()[^\]]*\]/g,
        message: 'Ã°Å¸Å¡Â¨ Feindliche Ecken-Rundung gefunden (rounded-[...]). Bitte nutze standardmÃƒÂ¤ÃƒÅ¸ige Tailwind-Klassen oder rounded-hero.'
    },
    {
        // Doppelte Deckkraft wie `bg-primary/10/40`. Tailwind erzeugt dafuer
        // KEINE Regel — das Element bekommt dann gar keinen Hintergrund, und
        // zwar lautlos. Entstanden ist das Muster bei Token-Umstellungen, wenn
        // `bg-indigo-50` in einem String ersetzt wurde, der schon ein `/40`
        // trug. Sieben solcher Klassen lagen unbemerkt im Bestand, darunter der
        // Markierungszustand im Erfahrungsschatz-Modal.
        regex: /\b(?:bg|text|border|ring|from|to|via|shadow|divide)-[a-z-]+\/\d{1,3}\/\d{1,3}/g,
        message: '[31m🚨 Ungültige doppelte Deckkraft gefunden (z. B. bg-primary/10/40). Tailwind erzeugt dafür keine Regel — das Element bleibt ohne Hintergrund. Bitte nur EINEN Deckkraft-Suffix verwenden.[0m'
    },
    {
        regex: /text-\[[^\]]*px\]/g,
        message: 'Ã°Å¸Å¡Â¨ WillkÃƒÂ¼rliche Pixel-TextgrÃƒÂ¶ÃƒÅ¸e gefunden (text-[...px]). Bitte nutze standardmÃƒÂ¤ÃƒÅ¸ige Tailwind-Typografie-Klassen wie text-xs, text-sm etc.'
    },
    {
        regex: /p[xy]-\[[^\]]*\]/g,
        message: 'Ã°Å¸Å¡Â¨ Beliebige SektionsabstÃƒÂ¤nde / Paddings gefunden (px-[...]/py-[...]). Bitte nutze die standardisierten Spacing-Tokens wie px-page-inline, py-section-vertical, p-card-padding oder Micro-Spacings.'
    }
];

// Marketing-specific checks
const marketingChecks = [
    {
        // Custom search to find raw black/slate/dark buttons of all color families on marketing pages, avoiding group-hover false positives
        regex: new RegExp(`className=.*bg-(${colorFamilies}|black|white)-(900|950|black)\\b.*\\bgroup(?!-)\\b`, 'g'),
        message: 'Ã°Å¸Å¡Â¨ Verbotener Button-Hintergrund (dunkle Farbkombination) gefunden. Koreki nutzt keine rein schwarzen/grauen/dunklen Standardbuttons auf Marketingseiten.'
    }
];

// Global check for any hardcoded brand/neutral colors (excluding semantic statuses like red/emerald/amber)
const hardcodedColorCheck = {
    regex: new RegExp(`(?:bg|text|border|ring|shadow|from|to|hover:bg|hover:text|hover:border|hover:ring|focus:bg|focus:text|focus:border|focus:ring)-(${brandAndNeutralColors})-\\d+`, 'g'),
    message: 'Ã°Å¸Å¡Â¨ Hardcodierte Farbe aus einer Tailwind-Farbfamilie gefunden. Bitte nutze systemische Design-Tokens (bg-primary, text-muted-foreground, border-border, accent-1 etc.) gemÃƒÂ¤ÃƒÅ¸ Style Guide.'
};

// Helper to recursively walk a directory
function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const list = fs.readdirSync(dir);
    for (const item of list) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getFiles(fullPath, files);
        } else if (validExtensions.includes(path.extname(fullPath))) {
            files.push(fullPath);
        }
    }
    return files;
}

console.log('Ã°Å¸â€Â Starte Koreki UI- & Farb-Audit...');

let totalViolations = 0;
let totalWarnings = 0;
const processedFiles = new Set();
const rawControlCounts = {};

for (const dir of targetDirs) {
    const files = getFiles(dir);
    for (const file of files) {
        if (processedFiles.has(file)) continue;
        processedFiles.add(file);

        const relPath = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');

        // Skip static marketing header and footer templates
        if (relPath === 'src/components/layout/MarketingHeader.tsx' || relPath === 'src/components/layout/MarketingFooter.tsx') {
            continue;
        }

        // Classification
        const isMarketingLayout = relPath.startsWith('src/components/marketing/');

        const isExcludedPage = excludedPages.includes(relPath);
        const isAppCompliance = relPath.startsWith('src/pages/app/');
        
        const isAppFile = !isMarketingLayout && (
            relPath.startsWith('src/components/') || 
            isExcludedPage || 
            isAppCompliance
        );

        // Apply grace period to both app files and marketing files
        const isGracePeriod = gracePeriodFiles.includes(relPath);

        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // Rohe Bedienelemente: pro DATEI gezaehlt, nicht pro Zeile.
        if (!relPath.startsWith('src/components/ui/')) {
            RAW_CONTROL_PATTERN.lastIndex = 0;
            const rohe = (content.match(RAW_CONTROL_PATTERN) || []).length;
            const erlaubt = RAW_CONTROL_BASELINE[relPath];
            rawControlCounts[relPath] = rohe;

            if (erlaubt === undefined && rohe > 0) {
                console.error(`[31m🚨 Rohe Bedienelemente (${rohe}) in einer bisher sauberen Datei. Der Style Guide verlangt Button/Input/Dropdown aus @/components/ui/.[0m
   Datei: ${relPath}
`);
                totalViolations++;
            } else if (erlaubt !== undefined && rohe > erlaubt) {
                console.error(`[31m🚨 Rohe Bedienelemente gewachsen: ${rohe} statt ${erlaubt}. Altlasten duerfen nicht zunehmen.[0m
   Datei: ${relPath}
`);
                totalViolations++;
            }
        }
        
        lines.forEach((line, index) => {
            // Ignore comment lines to prevent false positives in developer annotations
            if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
                return;
            }

            // 1. Shared layout checks
            for (const check of sharedChecks) {
                check.regex.lastIndex = 0;
                // Skip padding check for app pages (desktop, desktop-setup, compliance etc.)
                if (check.regex.toString().includes('p[xy]') && (isExcludedPage || isAppCompliance)) {
                    continue;
                }
                if (check.regex.test(line)) {
                    if (isGracePeriod) {
                        console.warn(`\x1b[33m[Grace Period Warning] ${check.message}\x1b[0m\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                        totalWarnings++;
                    } else {
                        console.error(`\x1b[31m${check.message}\x1b[0m\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                        totalViolations++;
                    }
                }
            }

            // 2. Marketing-specific checks
            if (!isAppFile) {
                for (const check of marketingChecks) {
                    check.regex.lastIndex = 0;
                    if (check.regex.test(line)) {
                        console.error(`\x1b[31m${check.message}\x1b[0m\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                        totalViolations++;
                    }
                }
            }

            // 3. Global hardcoded color check (now applies to all files: App + Marketing)
            hardcodedColorCheck.regex.lastIndex = 0;
            if (hardcodedColorCheck.regex.test(line)) {
                if (isGracePeriod) {
                    console.warn(`\x1b[33m[Grace Period Warning] ${hardcodedColorCheck.message}\x1b[0m\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                    totalWarnings++;
                } else {
                    console.error(`\x1b[31m${hardcodedColorCheck.message}\x1b[0m\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                    totalViolations++;
                }
            }
        });
    }
}

Object.entries(RAW_CONTROL_BASELINE).forEach(([relPath, erlaubt]) => {
    const ist = rawControlCounts[relPath];
    if (ist === undefined) {
        console.error(`[31m📉 ${relPath} existiert nicht mehr — aus RAW_CONTROL_BASELINE entfernen.[0m`);
        totalViolations++;
    } else if (ist === 0) {
        console.error(`[31m📉 ${relPath} hat keine rohen Bedienelemente mehr — aus RAW_CONTROL_BASELINE entfernen. 🎉[0m`);
        totalViolations++;
    } else if (ist < erlaubt) {
        console.error(`[31m📉 ${relPath}: nur noch ${ist} statt ${erlaubt} — Baseline nachziehen, damit die Ratsche greift.[0m`);
        totalViolations++;
    }
});

if (totalWarnings > 0) {
    console.warn(`\x1b[33mÃ¢Å¡Â Ã¯Â¸Â  UI-Audit: ${totalWarnings} Grace-Period-Warnungen gefunden (nicht-blockierend).\x1b[0m`);
}

if (totalViolations > 0) {
    console.error(`\x1b[31mÃ¢ÂÅ’ UI-Audit failed: ${totalViolations} style violations found.\nPlease correct these elements.\x1b[0m`);
    process.exit(1);
} else {
    console.log('\x1b[32mÃ¢Å“â€¦ UI-Audit successful. All elements correspond to the Koreki Style Guide!\x1b[0m');
    process.exit(0);
}










