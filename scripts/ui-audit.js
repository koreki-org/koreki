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


// --- Ratschen je Datei ------------------------------------------------------
//
// Zwei Regeln des Style Guides, die sich nicht zeilenweise pruefen lassen,
// sondern nur als Menge je Datei. Beide standen im Dokument und wurden von
// nichts geprueft — mit dem entsprechenden Ergebnis im Bestand.
//
// Das RATSCHEN-PRINZIP ist fuer beide gleich, deshalb steht es hier einmal:
// der Ist-Stand ist eingefroren. Neue Dateien muessen sauber sein,
// Bestandsdateien duerfen nicht wachsen, und wer eine verbessert, zieht ihren
// Wert mit runter. Faellt eine auf null, verlangt der Waechter das Austragen —
// die Listen koennen damit nur schrumpfen.
const perFileRatchets = [
    {
        name: 'Rohe Bedienelemente',
        // Der Style Guide verlangt Button/Input/Dropdown aus @/components/ui/.
        // src/components/ui/ ist ausgenommen: dort WRAPPT das Kit die rohen
        // Elemente, das ist ihr Zweck.
        pattern: /<(?:input|button|select)\b/g,
        skip: relPath => relPath.startsWith('src/components/ui/'),
        hinweis: 'Der Style Guide verlangt Button/Input/Dropdown aus @/components/ui/.',
        baseline: {
        'src/components/batch/ExportToolbar.tsx': 7,
        'src/components/batch/parts/GraphEditorPanel.tsx': 5,
        'src/components/batch/GradingGraphModal.tsx': 5,
        'src/components/batch/GradingMemoryStartScreen.tsx': 5,
        'src/components/settings/AiProfileModules.tsx': 5,
        // 5 -> 2 + 1 + 2: dieselben Elemente, nur auf drei Dateien verteilt. Der
        // Editor und sein Motor-Abschnitt sind aus SkillsModules herausgezogen;
        // die Elemente sind UNVERAENDERT umgezogen. Der Austausch gegen die
        // Kit-Komponenten aendert Abstaende und Radien und gehoert deshalb in
        // einen eigenen Schritt MIT Sichtpruefung.
        'src/components/settings/SkillsModules.tsx': 2,
        'src/components/settings/SkillEditorPanel.tsx': 1,
        'src/components/settings/SkillEngineSection.tsx': 2,
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
        }
    },
    {
        name: 'Hartcodiertes Weiss/Schwarz',
        // Die Farbregel unten kennt nur die Tailwind-FARBFAMILIEN (slate,
        // indigo, ...). `white` und `black` stehen in keiner davon und sind ihr
        // deshalb vollstaendig entgangen — 298 Faelle in 80 Dateien.
        //
        // ACHTUNG beim Abtragen: `bg-white/NN` mit Deckkraft ist in Modals und
        // Overlays die vorgesehene Glassmorphism-Optik und NICHT pauschal
        // falsch. Ohne Deckkraft gehoert dagegen `bg-background` hin, und
        // `text-white` auf farbigem Grund ist `text-primary-foreground`.
        pattern: /\b(?:bg|text|border|ring|shadow|from|to|via|divide|placeholder|hover:bg|hover:text|hover:border|hover:ring|focus:bg|focus:text|focus:border|focus:ring)-(?:white|black)(?:\/[0-9]{1,3})?\b/g,
        skip: () => false,
        hinweis: 'Bitte Design-Tokens nutzen (bg-background, text-primary-foreground). Ausnahme: bg-white/NN als Glassmorphism in Overlays.',
        baseline: {
        'src/components/batch/parts/GraphAiPanel.tsx': 15,
        'src/components/batch/GradingGraphModal.tsx': 9,
        'src/components/OnboardingModal.tsx': 9,
        'src/pages/agb.tsx': 9,
        'src/pages/desktop.tsx': 9,
        'src/components/batch/CorrectionAnalytics.tsx': 8,
        'src/components/marketing/WorkflowVisual.tsx': 8,
        'src/pages/desktop-setup.tsx': 8,
        'src/components/AiParamsModal.tsx': 7,
        'src/components/batch/BatchHeader.tsx': 7,
        'src/components/batch/parts/GraphEditorPanel.tsx': 7,
        'src/components/PromptSettingsModal.tsx': 7,
        'src/components/RedactionModal.tsx': 7,
        'src/components/SkillsSettingsModal.tsx': 7,
        'src/pages/privacy.tsx': 7,
        'src/pages/features.tsx': 6,
        'src/pages/index.tsx': 6,
        'src/components/batch/BatchFileListItem.tsx': 3,
        'src/components/batch/GradingMemoryEditorView.tsx': 5,
        'src/components/layout/HeaderBadges.tsx': 5,
        'src/components/marketing/ShowroomCard.tsx': 5,
        'src/pages/view.tsx': 5,
        'src/components/AVVUploadModal.tsx': 4,
        'src/components/batch/GradingMemoryModal.tsx': 4,
        'src/components/batch/parts/GraphTestingPanel.tsx': 4,
        'src/components/marketing/ModelProfiles.tsx': 4,
        'src/components/PDFTypeModal.tsx': 4,
        'src/components/ui/Badge.tsx': 4,
        'src/pages/features/expertise.tsx': 4,
        'src/pages/features/intelligence.tsx': 4,
        'src/pages/features/memory.tsx': 4,
        'src/pages/features/skills.tsx': 4,
        'src/pages/features/workflow.tsx': 4,
        'src/pages/security.tsx': 4,
        'src/components/avv-upload/StepUpload.tsx': 3,
        'src/components/batch/GradingMemoryCalibrateScreen.tsx': 3,
        'src/components/batch/GradingMemoryStartScreen.tsx': 3,
        'src/components/BatchProcessor.tsx': 3,
        'src/components/CreditsModal.tsx': 3,
        'src/components/marketing/BentoGrid.tsx': 3,
        'src/components/marketing/FeatureSpotlight.tsx': 3,
        'src/components/marketing/FeatureSubNav.tsx': 3,
        'src/components/marketing/ImageLightbox.tsx': 3,
        'src/components/ModelTypeModal.tsx': 3,
        'src/components/ui/Dropdown.tsx': 3,
        'src/pages/app/compliance/agb.tsx': 3,
        'src/pages/app/compliance/avv.tsx': 3,
        'src/pages/app/compliance/manual.tsx': 3,
        'src/pages/app/compliance/tom.tsx': 3,
        'src/pages/login.tsx': 3,
        'src/pages/self-hosting.tsx': 3,
        'src/components/admin/WorkspaceManager.tsx': 2,
        'src/components/batch/AnalyticsModal.tsx': 2,
        'src/components/batch/DigitalSlipsModal.tsx': 2,
        'src/components/marketing/FeatureIconGrid.tsx': 2,
        'src/components/marketing/PerformanceSection.tsx': 2,
        'src/components/QuickStartModal.tsx': 2,
        'src/components/SettingsModal.tsx': 2,
        'src/components/ui/Card.tsx': 2,
        'src/pages/register.tsx': 2,
        'src/components/admin/UserTable.tsx': 1,
        'src/components/avv-upload/StepDownload.tsx': 1,
        'src/components/batch/BatchItemPendingView.tsx': 1,
        'src/components/ConfirmationModal.tsx': 1,
        'src/components/layout/AppHeader.tsx': 1,
        'src/components/marketing/FeatureHero.tsx': 1,
        'src/components/marketing/FeaturePillar.tsx': 1,
        'src/components/marketing/MarketingModules.tsx': 1,
        'src/components/PDFSplitModal.tsx': 1,
        'src/components/PureKeyModal.tsx': 1,
        'src/components/settings/AiProfileModules.tsx': 1,
        'src/components/settings/OllamaConfig.tsx': 1,
        'src/components/settings/OpenAICompatibleConfig.tsx': 1,
        'src/components/ui/Button.tsx': 1,
        'src/components/ui/KorekiTooltip.tsx': 1,
        'src/components/ui/PopoverMenu.tsx': 1,
        'src/components/upload/ModelSolutionAutopilotBar.tsx': 1,
        'src/pages/contact.tsx': 1,
        'src/pages/org-admin.tsx': 1
        }
    }
];

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

        // Ratschen je Datei — Mengen, keine Zeilenfunde.
        for (const ratsche of perFileRatchets) {
            if (ratsche.skip(relPath)) continue;

            ratsche.pattern.lastIndex = 0;
            const ist = (content.match(ratsche.pattern) || []).length;
            const erlaubt = ratsche.baseline[relPath];
            (ratsche.counts || (ratsche.counts = {}))[relPath] = ist;

            if (erlaubt === undefined && ist > 0) {
                console.error(`\x1b[31m🚨 ${ratsche.name} (${ist}) in einer bisher sauberen Datei. ${ratsche.hinweis}\x1b[0m\n   Datei: ${relPath}\n`);
                totalViolations++;
            } else if (erlaubt !== undefined && ist > erlaubt) {
                console.error(`\x1b[31m🚨 ${ratsche.name} gewachsen: ${ist} statt ${erlaubt}. Altlasten duerfen nicht zunehmen.\x1b[0m\n   Datei: ${relPath}\n`);
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

perFileRatchets.forEach(ratsche => {
    Object.entries(ratsche.baseline).forEach(([relPath, erlaubt]) => {
        const ist = (ratsche.counts || {})[relPath];
        if (ist === undefined) {
            console.error(`\x1b[31m📉 ${relPath} existiert nicht mehr — aus der Baseline "${ratsche.name}" entfernen.\x1b[0m`);
            totalViolations++;
        } else if (ist === 0) {
            console.error(`\x1b[31m📉 ${relPath}: keine Treffer mehr für "${ratsche.name}" — aus der Baseline entfernen. 🎉\x1b[0m`);
            totalViolations++;
        } else if (ist < erlaubt) {
            console.error(`\x1b[31m📉 ${relPath}: nur noch ${ist} statt ${erlaubt} für "${ratsche.name}" — Baseline nachziehen.\x1b[0m`);
            totalViolations++;
        }
    });
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










