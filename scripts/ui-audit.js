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
    'src/pages/org-admin.tsx',
    'src/pages/view.tsx',
    'src/pages/_app.tsx',
    'src/pages/desktop.tsx',
    'src/pages/desktop-setup.tsx'
];

// List of app files that have been fully migrated to design tokens and must pass all checks
const migratedAppFiles = [
    'src/components/settings/GlobalBillingSettings.tsx',
    'src/components/batch/CalcTraceModal.tsx',
    'src/components/settings/OllamaConfig.tsx',
    'src/components/PDFSplitModal.tsx',
    'src/components/settings/OpenAICompatibleConfig.tsx',
    'src/components/CreditsModal.tsx'
];

// 21 Tailwind Color Families
const colorFamilies = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

// Brand and Neutral Color Families that must be tokenized in the app
const brandAndNeutralColors = 'slate|gray|zinc|neutral|stone|blue|indigo|violet|purple|fuchsia|pink';

// Shared structural/layout checks (apply to all UI files)
const sharedChecks = [
    {
        // Allow rounded-[var(--...)] CSS variables
        regex: /rounded-\[(?!var\()[^\]]*\]/g,
        message: '🚨 Feindliche Ecken-Rundung gefunden (rounded-[...]). Bitte nutze standardmäßige Tailwind-Klassen oder rounded-hero.'
    },
    {
        regex: /text-\[[^\]]*px\]/g,
        message: '🚨 Willkürliche Pixel-Textgröße gefunden (text-[...px]). Bitte nutze standardmäßige Tailwind-Typografie-Klassen wie text-xs, text-sm etc.'
    },
    {
        regex: /p[xy]-\[[^\]]*\]/g,
        message: '🚨 Beliebige Sektionsabstände / Paddings gefunden (px-[...]/py-[...]). Bitte nutze die standardisierten Spacing-Tokens wie px-page-inline, py-section-vertical, p-card-padding oder Micro-Spacings.'
    }
];

// Marketing-specific checks
const marketingChecks = [
    {
        // Custom search to find raw black/slate/dark buttons of all color families on marketing pages, avoiding group-hover false positives
        regex: new RegExp(`className=.*bg-(${colorFamilies}|black|white)-(900|950|black)\\b.*\\bgroup(?!-)\\b`, 'g'),
        message: '🚨 Verbotener Button-Hintergrund (dunkle Farbkombination) gefunden. Koreki nutzt keine rein schwarzen/grauen/dunklen Standardbuttons auf Marketingseiten.'
    }
];

// App-specific check for any hardcoded brand/neutral colors (excluding semantic statuses like red/emerald/amber)
const appColorCheck = {
    regex: new RegExp(`(?:bg|text|border|ring|shadow|from|to|hover:bg|hover:text|hover:border|hover:ring|focus:bg|focus:text|focus:border|focus:ring)-(${brandAndNeutralColors})-\\d+`, 'g'),
    message: '🚨 Hardcodierte Farbe aus einer Tailwind-Farbfamilie gefunden. Bitte nutze systemische Design-Tokens (bg-primary, text-muted-foreground, border-border etc.) gemäß Style Guide.'
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

console.log('🔍 Starte Koreki UI- & Farb-Audit...');

let totalViolations = 0;
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

        // Skip app files unless they are explicitly marked as fully migrated
        if (isAppFile && !migratedAppFiles.includes(relPath)) {
            continue;
        }

        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            // Ignore comment lines to prevent false positives in developer annotations
            if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
                return;
            }

            // 1. Shared layout checks
            for (const check of sharedChecks) {
                check.regex.lastIndex = 0;
                if (check.regex.test(line)) {
                    console.error(`${check.message}\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                    totalViolations++;
                }
            }

            // 2. Marketing-specific checks
            if (!isAppFile) {
                for (const check of marketingChecks) {
                    check.regex.lastIndex = 0;
                    if (check.regex.test(line)) {
                        console.error(`${check.message}\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                        totalViolations++;
                    }
                }
            }

            // 3. App-specific hardcoded color check
            if (isAppFile) {
                appColorCheck.regex.lastIndex = 0;
                if (appColorCheck.regex.test(line)) {
                    console.error(`${appColorCheck.message}\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                    totalViolations++;
                }
            }
        });
    }
}

if (totalViolations > 0) {
    console.error(`❌ UI-Audit failed: ${totalViolations} style violations found.\nPlease correct these elements.`);
    process.exit(1);
} else {
    console.log('✅ UI-Audit successful. All elements correspond to the Koreki Style Guide!');
    process.exit(0);
}
