import { execSync } from 'node:child_process';

/**
 * Strict-Ratsche fuer strictNullChecks
 * 🛡️📐
 *
 * tsconfig.json steht auf `strict: false`. Das CLAUDE.md-Compliance-Gate fordert
 * strikte Typen, der Compiler erzwingt aber nichts — deshalb sind 433 `any` und
 * eine unbekannte Zahl ungeprueter Null-Faelle entstanden.
 *
 * Global umzuschalten ist keine Option: die Altlast wuerde den Build brechen und
 * die Einstellung landete wieder auf `false`. Stattdessen dasselbe Prinzip wie
 * beim Groessen-Waechter — eine Ratsche, die nur in eine Richtung dreht.
 *
 * WIE ES FUNKTIONIERT
 * -------------------
 * Der gesamte Baum wird mit strictNullChecks geprueft. Erlaubt sind nur noch die
 * Fehler, die unten namentlich als Altlast eingetragen sind:
 *
 * - Eine Datei, die NICHT auf der Liste steht, muss fehlerfrei sein. Damit sind
 *   die rund 240 bereits sauberen Dateien ab sofort geschuetzt.
 * - Eine Altlast darf nicht MEHR Fehler bekommen.
 * - Wer eine Altlast verbessert, zieht ihre Zahl mit runter.
 * - Faellt eine Altlast auf null, muss sie aus der Liste verschwinden.
 *
 * Die Liste kann damit nur schrumpfen. Ist sie leer, kann `strictNullChecks` in
 * der tsconfig.json dauerhaft aktiviert und dieses Script geloescht werden.
 *
 * Stand bei Einfuehrung: 104 Fehler in 53 Dateien.
 */

/** Altlasten, eingefroren am 10.08.2026. Werte sind Fehlerzahlen. NUR SENKEN. */
const BASELINE = {
    'src/lib/task-utils.ts': 11,
    'src/lib/ai/ai-orchestrator.ts': 9,
    'src/pages/view.tsx': 8,
    'src/components/batch/parts/BatchTaskAnalysisCard.tsx': 7,
    'tests/unit/hooks/useCorrectionStatistics.test.tsx': 5,
    'src/lib/ai/prompt-builder.ts': 4,
    'src/hooks/file-processor/useProcessingPipeline.ts': 3,
    'src/hooks/useBatchStatus.ts': 3,
    'src/instrumentation.ts': 2,
    'src/components/batch/parts/BatchSolutionPanel.tsx': 2,
    'src/components/batch/GradingMemoryStartScreen.tsx': 2,
    'src/components/batch/GradingGraphModal.tsx': 2,
    'src/components/dashboard/DashboardModals.tsx': 2,
    'src/pages/api/user-context.ts': 1,
    'src/pages/api/user/consent-avv.ts': 1,
    'src/pages/api/user/delete.ts': 1,
    'src/pages/api/stripe/checkout.ts': 1,
    'src/pages/api/switch-workspace.ts': 1,
    'tests/unit/security-pillars.test.ts': 1,
    'src/pages/api/user/unlock-expert.ts': 1,
    'src/pages/app.tsx': 1,
    'src/pages/api/workspaces/join.ts': 1,
    'tests/unit/grading-memory-prompt.test.ts': 1,
    'tests/integration/StructuralIntegrity.test.ts': 1,
    'src/pages/api/user/update-skill-profile.ts': 1,
    'src/pages/api/user/update-grading-memory-profile.ts': 1,
    'src/pages/api/user/update-ai-profile.ts': 1,
    'src/pages/api/user/update-profile.ts': 1,
    'src/pages/api/user/update-mode.ts': 1,
    'src/lib/file-utils.ts': 1,
    'src/lib/ai/ocr-orchestrator.ts': 1,
    'src/lib/services/skill-profile-service.ts': 1,
    'src/lib/services/prompt-profile-service.ts': 1,
    'src/hooks/useGradingMemoryModalState.ts': 1,
    'src/components/batch/parts/BatchDoneHeader.tsx': 1,
    'src/components/batch/BatchFileListItem.tsx': 1,
    'src/hooks/useBatchItemDerivations.ts': 1,
    'src/components/upload/ModelSolutionCard.tsx': 1,
    'src/pages/api/admin/global-ai-settings.ts': 1,
    'src/pages/api/org-admin.ts': 1,
    'src/pages/api/billing/pure-deduct.ts': 1,
    'src/pages/api/admin/settings.ts': 1,
    'src/pages/api/admin/privacy-logs.ts': 1,
    'src/pages/api/admin/workspaces.ts': 1
};

const ERROR_LINE = /^(.+?)\((\d+),(\d+)\): error TS\d+/;

function collectErrors() {
    let output = '';
    try {
        execSync('npx tsc --noEmit --strictNullChecks', { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
        output = `${error.stdout || ''}${error.stderr || ''}`;
    }

    const counts = {};
    output.split(/\r?\n/).forEach(line => {
        const match = line.match(ERROR_LINE);
        if (!match) return;
        const file = match[1].trim().split('\\').join('/');
        counts[file] = (counts[file] || 0) + 1;
    });
    return counts;
}

const counts = collectErrors();
const regressions = [];
const staleEntries = [];

Object.entries(counts).forEach(([file, count]) => {
    const allowed = BASELINE[file];

    if (allowed === undefined) {
        regressions.push(
            `${file}: ${count} strictNullChecks-Fehler in einer bisher sauberen Datei. ` +
            `Beheben — oder bewusst in die BASELINE aufnehmen und im Review begruenden.`
        );
        return;
    }

    if (count > allowed) {
        regressions.push(
            `${file}: ${count} Fehler, erlaubt sind ${allowed}. Altlasten duerfen nicht wachsen.`
        );
    }
});

Object.entries(BASELINE).forEach(([file, allowed]) => {
    const actual = counts[file] || 0;

    if (actual === 0) {
        staleEntries.push(`${file}: fehlerfrei — aus der BASELINE entfernen. 🎉`);
    } else if (actual < allowed) {
        staleEntries.push(
            `${file}: nur noch ${actual} statt ${allowed} Fehler — BASELINE auf ${actual} ` +
            `nachziehen, damit die Ratsche greift.`
        );
    }
});

const remaining = Object.values(BASELINE).reduce((sum, n) => sum + n, 0);

if (regressions.length === 0 && staleEntries.length === 0) {
    const files = Object.keys(BASELINE).length;
    console.log(
        files === 0
            ? '✅ Strict-Ratsche: alles sauber. strictNullChecks kann jetzt dauerhaft in die tsconfig.json.'
            : `✅ Strict-Ratsche: keine Regression. Verbleibende Altlast: ${remaining} Fehler in ${files} Dateien.`
    );
    process.exit(0);
}

if (regressions.length > 0) {
    console.error('\n❌ STRICT-RATSCHE: Regression\n');
    regressions.forEach(entry => console.error(`  - ${entry}`));
}

if (staleEntries.length > 0) {
    console.error('\n📉 STRICT-RATSCHE: BASELINE veraltet\n');
    staleEntries.forEach(entry => console.error(`  - ${entry}`));
}

console.error('');
process.exit(1);
