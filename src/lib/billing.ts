import prisma from './prisma';
import { Prisma, type Workspace } from '@prisma/client';
import { isLocalInstance } from './env-context';

export type BillingModule = 'ocr' | 'correction';

/**
 * Resolves the active workspace for a user based on the "Exclusive Tenancy" rule.
 * 1. Priority: If the user belongs to an ORGANIZATION, that's their billing workspace.
 * 2. Fallback: Use the PERSONAL workspace.
 */
export async function resolveActiveWorkspace(logtoId: string): Promise<Workspace | null> {
    if (isLocalInstance()) {
        // Lokale Instanzen haben keine Mandanten und keine Abrechnung. Der
        // Platzhalter erfuellt trotzdem den vollen Datensatz, statt ihn per
        // `as any` zu behaupten — sonst faellt erst zur Laufzeit auf, wenn ein
        // Aufrufer ein Feld liest, das hier fehlt.
        const jetzt = new Date();
        return {
            id: 'local-workspace-id',
            name: 'Local Workspace',
            type: 'PERSONAL',
            credits: 999999,
            createdAt: jetzt,
            updatedAt: jetzt,
            avvAccepted: true,
            avvFileUrl: null,
            inviteCode: null
        };
    }

    const user = await prisma.user.findUnique({
        where: { logtoId },
        include: { memberships: { include: { workspace: true } } }
    });
    
    if (!user) return null;

    const activeWsId = user.activeWorkspaceId;
    const personalMembership = user.memberships.find(m => m.workspace.type === 'PERSONAL');
    const targetWsId = activeWsId || personalMembership?.workspaceId;
    
    if (!targetWsId) return null;

    const membership = user.memberships.find(m => m.workspaceId === targetWsId);
    return membership?.workspace || null;
}

/**
 * Darf fuer diesen Mandanten ueberhaupt verarbeitet werden?
 * ⚖️
 *
 * Die AVV-Zustimmung ist der Riegel vor jeder Verarbeitung personenbezogener
 * Schuelerdaten. Diese Funktion formuliert ihn EINMAL; `checkCompliance` fragt
 * ihn vor dem Anbieter-Aufruf ab, `performBillingAction` wirft ihn innerhalb
 * der Abrechnungs-Transaktion noch einmal als zweite Sicherung.
 *
 * @returns Fehlermeldung, oder null wenn verarbeitet werden darf.
 */
function komplianzFehler(
    workspace: Pick<Workspace, 'avvAccepted' | 'type'>,
    user: { role: string; appMode: string | null }
): string | null {
    const istSystemAdmin = user.role === 'ADMIN';
    if (workspace.avvAccepted || istSystemAdmin) return null;

    // Der Probemodus darf ohne AVV erkunden — dort werden bewusst keine
    // echten Schuelerdaten verarbeitet.
    if (user.appMode === 'TRIAL') return null;

    if (workspace.type === 'ORGANIZATION') {
        return 'Compliance: AVV-Zustimmung der Schulleitung fehlt. Verarbeitung gesperrt.';
    }
    if (user.appMode === 'STANDARD' || user.appMode === 'PURE') {
        return 'Compliance: AVV-Zustimmung erforderlich für Standard-Modus.';
    }
    return null;
}

/**
 * Der Compliance-Riegel VOR dem Anbieter-Aufruf.
 * 🚧
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026: Es gab ihn nicht. Vier KI-Routen tragen
 * ueber ihrem Aufruf von `resolveActiveWorkspace` die Ueberschrift
 * "COMPLIANCE EARLY GATEKEEPER" — aber diese Funktion prueft die
 * AVV-Zustimmung gar nicht und wirft ueberhaupt nie. Sie schlaegt nur einen
 * Workspace nach. Die einzige echte Pruefung stand in `performBillingAction`,
 * und die laeuft NACH dem Anbieter-Aufruf.
 *
 * Damit war die Wirkung: Schuelertext ging an den Anbieter, und erst
 * anschliessend fiel auf, dass die Schule nie zugestimmt hatte. Der Riegel hat
 * gehalten — aber zu spaet, um die Verarbeitung zu verhindern, die er
 * verhindern soll.
 *
 * @returns Fehlermeldung, oder null wenn verarbeitet werden darf.
 */
export async function checkCompliance(logtoId: string): Promise<string | null> {
    if (isLocalInstance()) return null;

    const user = await prisma.user.findUnique({
        where: { logtoId },
        include: { memberships: { include: { workspace: true } } }
    });
    if (!user) return 'Kein gültiger Workspace gefunden.';

    const personalWsId = user.memberships.find(m => m.workspace.type === 'PERSONAL')?.workspaceId;
    const targetWsId = user.activeWorkspaceId || personalWsId;
    const workspace = user.memberships.find(m => m.workspaceId === targetWsId)?.workspace;
    if (!workspace) return 'Kein gültiger Workspace gefunden.';

    return komplianzFehler(workspace, { role: user.role, appMode: user.appMode });
}

/**
 * Saeule 7: absoluter Monatsdeckel in Euro.
 *
 * Anders als die Credits ist das keine Grenze pro Mandant, sondern die
 * Notbremse fuer die Instanz als Ganzes — sie schuetzt Koreki davor, dass ein
 * einzelner Monat die Anbieterkosten entgleisen laesst. Vom Credit-Modell
 * voellig unabhaengig: Aufrufe, die bewusst keine Credits kosten (kombinierte
 * Abrechnung), zaehlen hier trotzdem mit, weil sie beim Anbieter echtes Geld
 * kosten.
 *
 * Diese Pruefung stand vorher inline in genau zwei Routen. Die anderen acht
 * KI-Routen hatten damit gar keinen absoluten Deckel — dieselbe Lektion wie bei
 * der Anbieter-Verbindung: was kopiert wird, fehlt irgendwo.
 *
 * @returns Fehlermeldung, oder null wenn Budget vorhanden.
 */
export async function checkAiBudget(module: BillingModule): Promise<string | null> {
    if (isLocalInstance()) return null;

    const settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) return null;

    const spent = module === 'ocr'
        ? (settings.ocrMonthlyUsage / 1_000_000) * settings.ocrPricePerMillion
        : (settings.correctionMonthlyUsage / 1_000_000) * settings.correctionPricePerMillion;

    const budget = module === 'ocr' ? settings.ocrBudget : settings.correctionBudget;

    if (spent >= budget) {
        return 'Aktuell zu hohe Auslastung, bitte versuchen Sie es später erneut.';
    }

    return null;
}

/**
 * Guthaben-Vorpruefung VOR dem Anbieter-Aufruf.
 *
 * performBillingAction prueft das Guthaben ebenfalls, laeuft aber erst nach dem
 * bezahlten Provider-Request. Ohne diese Vorpruefung erzeugt ein Konto ohne
 * Credits echte Anbieterkosten und erhaelt die Ablehnung erst danach — die
 * Kosten bleiben trotzdem stehen.
 *
 * Bewusst keine Reservierung: der Betrag wird nur geprueft, abgerechnet wird
 * weiterhin transaktional in performBillingAction. Parallele Anfragen koennen
 * damit im Grenzfall ins Minus laufen; das ist gegenueber einer vollen
 * Reserve-and-Settle-Mechanik der bewusst einfachere Weg.
 */
export async function checkCreditsAvailable(
    logtoId: string,
    creditCost: number
): Promise<string | null> {
    if (isLocalInstance()) return null;

    // Die Komplianz zuerst — und BEVOR der Kostenfall abkuerzt. Ein Lauf, der
    // bewusst nichts kostet (kombinierte Abrechnung, inklusive Laeufe),
    // verarbeitet trotzdem Schuelerdaten und braucht dieselbe Zustimmung.
    const komplianz = await checkCompliance(logtoId);
    if (komplianz) return komplianz;

    if (creditCost <= 0) return null;

    const workspace = await resolveActiveWorkspace(logtoId);
    if (!workspace) {
        return 'Kein gültiger Workspace gefunden.';
    }

    if (workspace.credits < creditCost) {
        return `Nicht genügend Credits. Benötigt: ${creditCost}, Vorhanden: ${workspace.credits}`;
    }

    return null;
}

/**
 * High-level function to check credits, perform action billing, and track token usage.
 * Replaces processBillingAndUsage and manual workspace resolution.
 */
export async function performBillingAction(params: {
    logtoId: string;
    module: BillingModule;
    inputTokens: number;
    outputTokens: number;
    creditCost: number;
}) {
    const { logtoId, module, inputTokens, outputTokens, creditCost } = params;

    // --- ARCHITECTURAL BYPASS (COMMUNITY / DESKTOP) ---
    // Local instances bypass the credit/token tracking to allow "Zero-Ops" usage.
    if (isLocalInstance()) {
        return { success: true };
    }

    const totalTokens = inputTokens + outputTokens;

    return await prisma.$transaction(async (tx) => {
        // 1. Resolve Active Workspace
        const user = (await tx.user.findUnique({
            where: { logtoId },
            include: { memberships: { include: { workspace: true } } }
        }));

        // Steht seit jeher ungeprueft da: der Zugriff darunter lief bei einem
        // fehlenden Nutzer in einen TypeError statt in eine verstaendliche
        // Meldung. Verdeckt hat es ein `as any` auf dem Ergebnis.
        if (!user) throw new Error('Nutzer für die Abrechnung nicht gefunden.');

        const activeWsId = user.activeWorkspaceId;
        const personalWsId = user.memberships?.find(m => m.workspace?.type === 'PERSONAL')?.workspaceId;
        let targetWsId = activeWsId || personalWsId;
        const activeMembership = user.memberships.find(m => m.workspaceId === targetWsId);

        if (!activeMembership) throw new Error('Kein gültiger Workspace gefunden.');

        const workspace = activeMembership.workspace;

        // --- COMPLIANCE GATEKEEPER: No AVV = No Processing ---
        //
        // Dieselbe Regel wie in `checkCompliance`, hier als zweite Sicherung
        // innerhalb der Transaktion. Die Formulierung steht nur an einer
        // Stelle (`komplianzFehler`) — zwei Fassungen derselben Regel waeren
        // in diesem Projekt schon mehrfach auseinandergelaufen.
        const komplianz = komplianzFehler(workspace, { role: user.role, appMode: user.appMode });
        if (komplianz) throw new Error(komplianz);

        // 2. Check Credits
        if (creditCost > 0 && workspace.credits < creditCost) {
            throw new Error(`Nicht genügend Credits. Benötigt: ${creditCost}, Vorhanden: ${workspace.credits}`);
        }

        // 3. Prepare Updates
        const userUpdateData: Prisma.UserUpdateInput = {};
        const workspaceUpdateData: Prisma.WorkspaceUpdateInput = {};
        const systemUpdateData: Prisma.SystemSettingsUpdateInput = {};

        if (module === 'ocr') {
            userUpdateData.ocrInputTokens = { increment: Math.floor(inputTokens) };
            userUpdateData.ocrOutputTokens = { increment: Math.floor(outputTokens) };
            systemUpdateData.ocrInputMonthlyUsage = { increment: Math.floor(inputTokens) };
            systemUpdateData.ocrOutputMonthlyUsage = { increment: Math.floor(outputTokens) };
            systemUpdateData.ocrMonthlyUsage = { increment: Math.floor(totalTokens) };
        } else {
            userUpdateData.correctionInputTokens = { increment: Math.floor(inputTokens) };
            userUpdateData.correctionOutputTokens = { increment: Math.floor(outputTokens) };
            systemUpdateData.correctionInputMonthlyUsage = { increment: Math.floor(inputTokens) };
            systemUpdateData.correctionOutputMonthlyUsage = { increment: Math.floor(outputTokens) };
            systemUpdateData.correctionMonthlyUsage = { increment: Math.floor(totalTokens) };
        }

        if (creditCost > 0) {
            workspaceUpdateData.credits = { decrement: creditCost };
            if (module === 'ocr') userUpdateData.ocrCreditsUsed = { increment: creditCost };
            else userUpdateData.correctionCreditsUsed = { increment: creditCost };
        }

        // 4. Execute Transaction Operations
        await tx.user.update({ where: { logtoId }, data: userUpdateData });
        const updatedWorkspace = await tx.workspace.update({ where: { id: workspace.id }, data: workspaceUpdateData });
        
        await tx.systemSettings.upsert({
            where: { id: 'singleton' },
            update: systemUpdateData,
            create: {
                id: 'singleton',
                ocrMonthlyUsage: module === 'ocr' ? Math.floor(totalTokens) : 0,
                correctionMonthlyUsage: module === 'correction' ? Math.floor(totalTokens) : 0,
                ocrInputMonthlyUsage: module === 'ocr' ? Math.floor(inputTokens) : 0,
                ocrOutputMonthlyUsage: module === 'ocr' ? Math.floor(outputTokens) : 0,
                correctionInputMonthlyUsage: module === 'correction' ? Math.floor(inputTokens) : 0,
                correctionOutputMonthlyUsage: module === 'correction' ? Math.floor(outputTokens) : 0,
                lastResetMonth: new Date().getMonth() + 1,
                lastResetYear: new Date().getFullYear()
            }
        });

        return { success: true, workspace: updatedWorkspace };
    });
}

/**
 * Simplified checkAndDeductCredits (shorthand for performBillingAction with tokens=0)
 */
export async function checkAndDeductCredits(logtoId: string, amount: number) {
    return performBillingAction({
        logtoId,
        module: 'ocr', // Default module for simple checks
        inputTokens: 0,
        outputTokens: 0,
        creditCost: amount
    });
}

/**
 * Fetches the current system-wide AI status (costs vs budget).
 */
export async function getSystemAiStatus() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let settings = await prisma.systemSettings.findUnique({
        where: { id: 'singleton' }
    });

    // Initialize if not exists
    if (!settings) {
        settings = await prisma.systemSettings.create({
            data: {
                id: 'singleton',
                lastResetMonth: currentMonth,
                lastResetYear: currentYear
            }
        });
    }

    // Monthly Reset Logic
    if (settings.lastResetMonth !== currentMonth || settings.lastResetYear !== currentYear) {
        settings = await prisma.systemSettings.update({
            where: { id: 'singleton' },
            data: {
                ocrMonthlyUsage: 0,
                correctionMonthlyUsage: 0,
                ocrInputMonthlyUsage: 0,
                ocrOutputMonthlyUsage: 0,
                correctionInputMonthlyUsage: 0,
                correctionOutputMonthlyUsage: 0,
                lastResetMonth: currentMonth,
                lastResetYear: currentYear
            }
        });
    }

    // Industrial Only Cost Calculation (Input vs Output)
    const ocrCost = 
        ((settings.ocrInputMonthlyUsage / 1_000_000) * settings.ocrInputPricePerMillion) +
        ((settings.ocrOutputMonthlyUsage / 1_000_000) * settings.ocrOutputPricePerMillion);
    
    const correctionCost = 
        ((settings.correctionInputMonthlyUsage / 1_000_000) * settings.correctionInputPricePerMillion) +
        ((settings.correctionOutputMonthlyUsage / 1_000_000) * settings.correctionOutputPricePerMillion);

    const ocrBrakeActive = ocrCost >= settings.ocrBudget;
    const correctionBrakeActive = correctionCost >= settings.correctionBudget;

    const message = (ocrBrakeActive || correctionBrakeActive)
        ? "Aktuell zu hohe Auslastung, bitte versuchen Sie es später erneut."
        : null;

    return {
        ocrCost,
        correctionCost,
        ocrBudget: settings.ocrBudget,
        correctionBudget: settings.correctionBudget,
        ocrBrakeActive,
        correctionBrakeActive,
        message
    };
}
