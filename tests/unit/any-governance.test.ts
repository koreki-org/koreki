import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Ratsche gegen explizite `any`
 * 🧯📐
 *
 * Der letzte Punkt des Compliance-Gates in CLAUDE.md ohne Waechter. Die
 * impliziten `any` erzwingt inzwischen der Compiler (`noImplicitAny`), die
 * ausdruecklich hingeschriebenen aber nicht — und genau die haben sich
 * angesammelt: 530 Vorkommen in 128 Dateien.
 *
 * `strict: true` global zu setzen bringt hier nichts: ein ausgeschriebenes
 * `any` ist gueltiges TypeScript, kein Compilerfehler. Es braucht eine eigene
 * Zaehlung.
 *
 * RATSCHEN-PRINZIP (wie bei den Dateigroessen):
 * - Neue Dateien duerfen kein `any` enthalten.
 * - Bestandsdateien duerfen nicht mehr bekommen.
 * - Wer eine verbessert, senkt ihren Wert mit.
 * - Faellt eine auf null, muss sie aus der Liste verschwinden.
 *
 * Kommentare werden vor dem Zaehlen entfernt: sonst zaehlte jede Erwaehnung
 * von "any" in einer Begruendung als Verstoss — auch diese hier.
 */

const SRC_DIR = join(process.cwd(), 'src');

/** Altlasten, eingefroren am 12.08.2026. NUR SENKEN, NIE ANHEBEN. */
const ANY_BASELINE: Record<string, number> = {
    'hooks/useSkillProfiles.ts': 9,
    'hooks/useGradingMemoryModalState.ts': 18,
    'hooks/file-processor/useProcessingPipeline.ts': 16,
    'lib/ai/ai-orchestrator.ts': 16,
    'lib/ai/ollama-logic.ts': 16,
    'components/settings/SkillsModules.tsx': 12,
    'lib/ai/mistral-provider.ts': 12,
    'lib/services/admin-service.ts': 4,
    'components/batch/parts/GraphAiPanel.tsx': 10,
    'lib/billing.ts': 9,
    'lib/services/user-service.ts': 8,
    'components/batch/parts/BatchTaskAnalysisCard.tsx': 9,
    'components/batch/parts/GraphEditorPanel.tsx': 9,
    'components/dashboard/DashboardModals.tsx': 9,
    'lib/logic.ts': 9,
    'components/upload/ModelSolutionCard.tsx': 8,
    'hooks/usePromptProfiles.ts': 8,
    'pages/app.tsx': 8,
    'hooks/useAiProfiles.ts': 7,
    'hooks/usePromptGovernance.ts': 7,
    'lib/pdf.ts': 7,
    'components/settings/AiProfileSidebar.tsx': 6,
    'hooks/useSkillGovernance.ts': 6,
    'lib/ai/openai-provider.ts': 6,
    'lib/grading/calc-trace-generator.ts': 6,
    'lib/grading/graph-preview.ts': 6,
    'lib/logger.ts': 6,
    'lib/services/local-profile-service.ts': 6,
    'pages/api/user.ts': 6,
    'pages/api/user/grading-memories.ts': 6,
    'components/batch/GradingGraphModal.tsx': 5,
    'components/settings/ProfileModules.tsx': 5,
    'components/settings/SkillsSidebar.tsx': 5,
    'hooks/useFileProcessor.ts': 5,
    'lib/ai/prompt-builder.ts': 5,
    'lib/grading/graph-intake.ts': 5,
    'pages/api/generate-calc-trace.ts': 5,
    'hooks/useAiGovernance.ts': 4,
    'hooks/useDashboardActions.ts': 4,
    'lib/file-utils.ts': 4,
    'lib/grading/types.ts': 1,
    'pages/api/ai-correct.ts': 4,
    'pages/api/pure/proxy.ts': 4,
    'pages/api/stripe/checkout.ts': 4,
    'pages/api/user/grading-memories/append.ts': 4,
    'types/index.ts': 4,
    'components/batch/parts/GraphTestingPanel.tsx': 3,
    'components/PDFSplitModal.tsx': 3,
    'components/SkillsSettingsModal.tsx': 3,
    'hooks/file-processor/useBatchActions.ts': 3,
    'hooks/store/useBatchStore.ts': 3,
    'hooks/useAdminData.ts': 3,
    'hooks/useDashboardOrchestrator.ts': 3,
    'hooks/useRedactionEngine.ts': 3,
    'instrumentation.ts': 3,
    'lib/ai/prompt-library.ts': 3,
    'lib/excel/export-content.ts': 3,
    'lib/grading/CalcTrace.ts': 3,
    'lib/grading/graph-generator.ts': 3,
    'lib/grading/plugins.ts': 3,
    'lib/logto-mgmt.ts': 3,
    'lib/pdf-utils.ts': 3,
    'lib/security.ts': 3,
    'lib/utils.ts': 3,
    'pages/api/clean-and-analyze.ts': 3,
    'pages/api/clean-and-map.ts': 3,
    'pages/api/user/grading-memories/generate.ts': 3,
    'components/AiParamsModal.tsx': 2,
    'components/batch/AnalyticsModal.tsx': 2,
    'components/batch/BatchFileListItem.tsx': 2,
    'components/batch/BatchItemDoneView.tsx': 2,
    'components/batch/BatchItemPendingView.tsx': 2,
    'components/batch/GradingMemoryModal.tsx': 2,
    'components/batch/parts/BatchSolutionPanel.tsx': 2,
    'components/batch/parts/SecondOpinionDrawer.tsx': 2,
    'components/UploadGrid.tsx': 2,
    'hooks/useAuth.ts': 2,
    'hooks/useGradingMemories.ts': 2,
    'lib/ai/constants.ts': 2,
    'lib/ai/extraction-logic.ts': 2,
    'lib/api-client.ts': 2,
    'lib/parsers/markdown-profile-parser.ts': 2,
    'lib/validation.ts': 2,
    'pages/api/admin/users.ts': 1,
    'pages/api/generate-graph.ts': 2,
    'pages/api/org-admin.ts': 1,
    'pages/api/org-admin/update-code.ts': 1,
    'pages/api/refine-graph.ts': 2,
    'pages/api/second-opinion.ts': 2,
    'pages/api/stripe/webhook.ts': 2,
    'pages/api/user/grading-memories/anonymize.ts': 2,
    'pages/api/user/skill-profiles.ts': 2,
    'pages/api/user/update-mode.ts': 2,
    'components/admin/ComplianceAuditLog.tsx': 1,
    'components/batch/CalcTraceModal.tsx': 1,
    'components/layout/HeaderBadges.tsx': 1,
    'components/PromptSettingsModal.tsx': 1,
    'components/settings/AiProfileModules.tsx': 1,
    'components/settings/PrivacySection.tsx': 1,
    'components/settings/UnifiedAiConfig.tsx': 1,
    'components/upload/ModelSolutionTaskCard.tsx': 1,
    'hooks/useBatchItemDerivations.ts': 1,
    'lib/api-utils.ts': 1,
    'lib/compliance.ts': 1,
    'lib/distribution.ts': 1,
    'lib/excel/export-performance.ts': 1,
    'lib/excel/parser.ts': 1,
    'lib/grading-memory-utils.ts': 1,
    'lib/grading/calc-trace-extraction.ts': 1,
    'lib/services/global-settings-service.ts': 1,
    'lib/services/skill-profile-service.ts': 1,
    'lib/skills/skill-selection.ts': 1,
    'pages/api/admin/privacy-logs.ts': 1,
    'pages/api/billing/pure-deduct.ts': 1,
    'pages/api/extract-image.ts': 1,
    'pages/api/logto/[action].ts': 1,
    'pages/api/privacy/log.ts': 1,
    'pages/api/user/ai-profiles.ts': 1,
    'pages/api/user/prompt-profiles.ts': 1,
    'pages/api/user/unlock-expert.ts': 1,
    'pages/contact.tsx': 1
};

/**
 * Entfernt Block- und Zeilenkommentare.
 *
 * Das `[^:]` vor den Schraegstrichen schuetzt URLs: `https://...` ist kein
 * Kommentarbeginn.
 */
const ohneKommentare = (quelltext: string): string =>
    quelltext
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');

const countAny = (quelltext: string): number =>
    (ohneKommentare(quelltext).match(/\bany\b/g) || []).length;

const getFilesRecursively = (dir: string): string[] => {
    let results: string[] = [];
    readdirSync(dir).forEach(entry => {
        const filePath = join(dir, entry);
        results = lstatSync(filePath).isDirectory()
            ? results.concat(getFilesRecursively(filePath))
            : results.concat(filePath);
    });
    return results;
};

const toRelative = (filePath: string) => relative(SRC_DIR, filePath).split(sep).join('/');

describe('Any Governance', () => {
    const sourceFiles = getFilesRecursively(SRC_DIR)
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    it('keeps new code free of explicit any (existing offenders may only shrink)', () => {
        const violations: string[] = [];

        sourceFiles.forEach(filePath => {
            const relativePath = toRelative(filePath);
            const anzahl = countAny(readFileSync(filePath, 'utf8'));
            const baseline = ANY_BASELINE[relativePath];

            if (baseline === undefined) {
                if (anzahl > 0) {
                    violations.push(
                        `${relativePath}: ${anzahl}x \`any\` in einer bisher sauberen Datei. ` +
                        `Typ ausschreiben, oder bewusst in ANY_BASELINE aufnehmen und im Review begründen.`
                    );
                }
                return;
            }

            if (anzahl > baseline) {
                violations.push(
                    `${relativePath}: ${anzahl}x \`any\` — Altlast wächst (Baseline ${baseline}).`
                );
            }
        });

        if (violations.length > 0) {
            throw new Error(`ANY GOVERNANCE:\n  - ${violations.join('\n  - ')}`);
        }
    });

    /** Haelt die Ratsche am Ziehen — sonst waere eine verbesserte Datei wieder frei. */
    it('requires cleaned-up files to leave the baseline', () => {
        const stale: string[] = [];

        Object.entries(ANY_BASELINE).forEach(([relativePath, baseline]) => {
            let anzahl: number;
            try {
                anzahl = countAny(readFileSync(join(SRC_DIR, relativePath), 'utf8'));
            } catch {
                stale.push(`${relativePath}: existiert nicht mehr — aus ANY_BASELINE entfernen.`);
                return;
            }

            if (anzahl === 0) {
                stale.push(`${relativePath}: kein \`any\` mehr — aus ANY_BASELINE entfernen. 🎉`);
            } else if (anzahl < baseline) {
                stale.push(
                    `${relativePath}: nur noch ${anzahl} statt ${baseline} — Baseline nachziehen.`
                );
            }
        });

        if (stale.length > 0) {
            throw new Error(`ANY BASELINE VERALTET:\n  - ${stale.join('\n  - ')}`);
        }
    });
});
