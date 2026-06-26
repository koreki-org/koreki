const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, '..', 'src', 'pages'),
    path.join(__dirname, '..', 'src', 'components', 'marketing')
];

// File extension filter
const validExtensions = ['.ts', '.tsx', '.js', '.jsx'];

// List of files to exclude from the UI audit (internal app dashboards and Tauri onboarding)
const excludedFiles = [
    'src/pages/app.tsx',
    'src/pages/admin.tsx',
    'src/pages/org-admin.tsx',
    'src/pages/view.tsx',
    'src/pages/_app.tsx',
    'src/pages/desktop.tsx',
    'src/pages/desktop-setup.tsx'
];

// Prohibited styling patterns
const checks = [
    {
        regex: /rounded-\[[^\]]*\]/g,
        message: '🚨 Feindliche Ecken-Rundung gefunden (rounded-[...]). Bitte nutze standardmäßige Tailwind-Klassen oder rounded-hero.'
    },
    {
        regex: /text-\[[^\]]*px\]/g,
        message: '🚨 Willkürliche Pixel-Textgröße gefunden (text-[...px]). Bitte nutze standardmäßige Tailwind-Typografie-Klassen wie text-xs, text-sm etc.'
    },
    {
        // Custom search to find raw black/slate buttons on marketing pages.
        regex: /className=.*bg-(slate-900|black|gray-900).*group/g,
        message: '🚨 Verbotener Button-Hintergrund (bg-slate-900/black/gray-900) gefunden. Koreki nutzt keine rein schwarzen/grauen Standardbuttons auf Marketingseiten.'
    },
    {
        regex: /p[xy]-\[[^\]]*\]/g,
        message: '🚨 Beliebige Sektionsabstände / Paddings gefunden (px-[...]/py-[...]). Bitte nutze die standardisierten Spacing-Tokens wie px-page-inline, py-section-vertical, p-card-padding oder Micro-Spacings.'
    }
];

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

console.log('🔍 Starte Koreki UI-Audit für Marketingseiten...');

let totalViolations = 0;

for (const dir of targetDirs) {
    const files = getFiles(dir);
    for (const file of files) {
        const relPath = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
        if (excludedFiles.includes(relPath)) {
            continue; // Skip excluded desktop and application pages
        }
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            for (const check of checks) {
                // Reset regex lastIndex
                check.regex.lastIndex = 0;
                if (check.regex.test(line)) {
                    // Ignore comment lines to prevent false positives in instructions
                    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
                        continue;
                    }
                    const relPath = path.relative(path.join(__dirname, '..'), file);
                    console.error(`${check.message}\n   Datei: ${relPath}:${index + 1}\n   Zeile: ${line.trim()}\n`);
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
    console.log('✅ UI-Audit successful. All marketing elements correspond to the Koreki Style Guide!');
    process.exit(0);
}
