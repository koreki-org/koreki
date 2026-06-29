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
// List of app files in the grace period (not yet migrated to design tokens, warnings only)
const gracePeriodFiles = [

    'src/components/admin/ComplianceAuditLog.tsx',
    'src/components/admin/CostOverview.tsx',
    'src/components/admin/WorkspaceManager.tsx',
    'src/components/avv-upload/TeacherViewInfo.tsx',
    'src/components/batch/parts/AnonymizeModal.tsx',
    'src/components/batch/parts/BatchItemStatusSummary.tsx',
    'src/components/batch/parts/BatchSolutionPanel.tsx',
    'src/components/batch/parts/BatchTaskAnalysisCard.tsx',
    'src/components/batch/parts/MobileViewSelector.tsx',
    'src/components/batch/parts/SecondOpinionDrawer.tsx',
    'src/components/batch/BatchFileListItem.tsx',
    'src/components/batch/BatchHelpContent.tsx',
    'src/components/batch/BatchItemDoneView.tsx',
    'src/components/batch/CorrectionAnalytics.tsx',
    'src/components/batch/ExportToolbar.tsx',
    'src/components/dashboard/DashboardModals.tsx',
    'src/components/guards/AuthGuard.tsx',
    'src/components/layout/AdminHeader.tsx',
    'src/components/layout/BackgroundGradients.tsx',
    'src/components/layout/HeaderBadges.tsx',
    'src/components/marketing/BentoGrid.tsx',
    'src/components/marketing/FeatureHero.tsx',
    'src/components/marketing/FeatureIconGrid.tsx',
    'src/components/marketing/FeaturePillar.tsx',
    'src/components/marketing/FeatureSpotlight.tsx',
    'src/components/marketing/FeatureSubNav.tsx',
    'src/components/marketing/ImageLightbox.tsx',
    'src/components/marketing/MarketingModules.tsx',
    'src/components/marketing/ModelProfiles.tsx',
    'src/components/marketing/PerformanceSection.tsx',
    'src/components/marketing/ShowroomCard.tsx',
    'src/components/marketing/WorkflowVisual.tsx',
    'src/components/org/OrgMemberTable.tsx',
    'src/components/org/OrgModals.tsx',
    'src/components/org/OrgStats.tsx',
    'src/components/settings/AiProfileModules.tsx',
    'src/components/settings/AIProviderSection.tsx',
    'src/components/settings/ProfileModules.tsx',
    'src/components/settings/SettingsSections.tsx',
    'src/components/ui/Button.tsx',
    'src/components/ui/Card.tsx',
    'src/components/ui/Checkbox.tsx',
    'src/components/ui/HighlightableTextArea.tsx',
    'src/components/ui/Input.tsx',
    'src/components/ui/Textarea.tsx',
    'src/components/AiConfigurationContent.tsx',
    'src/components/AiSetupModal.tsx',
    'src/components/BatchProcessor.tsx',
    'src/components/ConfirmationModal.tsx',
    'src/components/Logo.tsx',
    'src/components/ModelTypeModal.tsx',
    'src/components/PDFTypeModal.tsx',
    'src/components/SettingsModal.tsx',
    'src/components/UploadGrid.tsx',
    // Excluded pages & App compliance pages
    'src/pages/app.tsx',
    'src/pages/admin.tsx',
    'src/pages/org-admin.tsx',
    'src/pages/view.tsx',
    'src/pages/_app.tsx',
    'src/pages/app/compliance/agb.tsx',
    'src/pages/app/compliance/avv.tsx',
    'src/pages/app/compliance/manual.tsx',
    'src/pages/app/compliance/tom.tsx'
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

// App-specific check for any hardcoded brand/neutral colors (excluding semantic statuses like red/emerald/amber)
const appColorCheck = {
    regex: new RegExp(`(?:bg|text|border|ring|shadow|from|to|hover:bg|hover:text|hover:border|hover:ring|focus:bg|focus:text|focus:border|focus:ring)-(${brandAndNeutralColors})-\\d+`, 'g'),
    message: 'Ã°Å¸Å¡Â¨ Hardcodierte Farbe aus einer Tailwind-Farbfamilie gefunden. Bitte nutze systemische Design-Tokens (bg-primary, text-muted-foreground, border-border etc.) gemÃƒÂ¤ÃƒÅ¸ Style Guide.'
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

        // Skip LOC-limit modals entirely
        if (relPath === 'src/components/batch/GradingGraphModal.tsx' || relPath === 'src/components/batch/GradingMemoryModal.tsx') {
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

        const isGracePeriod = isAppFile && gracePeriodFiles.includes(relPath);

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

            // 3. App-specific hardcoded color check
            if (isAppFile) {
                appColorCheck.regex.lastIndex = 0;
                if (appColorCheck.regex.test(line)) {
                    if (isGracePeriod) {
                        console.warn(`\x1b[33m[Grace Period Warning] ${appColorCheck.message}\x1b[0m\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                        totalWarnings++;
                    } else {
                        console.error(`\x1b[31m${appColorCheck.message}\x1b[0m\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
                        totalViolations++;
                    }
                }
            }
        });
    }
}

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



