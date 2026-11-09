import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Glas und Schatten nur dort, wo etwas schwebt (Layer 1)
 * 🪟🛡️
 *
 * `koreki-design-system` §5 sagt zwei Saetze, die seit jeher gelten und bis zum
 * 09.11.2026 keinen Waechter hatten:
 *
 *   „Schatten: Karten tragen sich ueber die Flaeche, Schatten hoechstens
 *    `shadow-sm`. Modals `shadow-glass`, verankerte Popover `shadow-xl`."
 *   „Glas und Unschaerfe nur fuer Ebenen, die ueber Inhalt schweben. Nie fuer
 *    Inhaltskarten."
 *
 * Ohne Waechter sind beide gedriftet: 139 Stellen in ueber 50 Dateien, darunter
 * die beiden Hauptkarten der Korrektur-Oberflaeche (`bg-card/60
 * backdrop-blur-xl shadow-xl`) und die neue Ablageflaeche, die am selben Tag
 * entstanden ist. Das ist die Lehre aus CLAUDE.md in einem Satz: Jede Regel
 * ohne Waechter driftet, auch eine, die alle kennen.
 *
 * WARUM DAS NICHT NUR GESCHMACK IST
 * ---------------------------------
 * Unschaerfe kostet Rechenzeit und zwingt den Browser, die Flaeche darunter
 * dauernd neu zu zeichnen. An einer Karte, hinter der nur die einfarbige Seite
 * liegt, sieht man davon NICHTS — es ist Aufwand ohne Bild. Und eine
 * durchscheinende Karte nimmt die Farbe dessen an, was zufaellig dahinter
 * liegt: Genau so entstand am 09.11.2026 die sichtbare Naht zwischen klebender
 * Kopfzeile und Karte, die ohne Messung niemand erklaeren konnte.
 *
 * WIE DIESER WAECHTER ARBEITET
 * ----------------------------
 * Er zaehlt je Datei `backdrop-blur*` und `shadow-lg|xl|2xl` (Kommentare vorher
 * entfernt — die Begruendungen hier zitieren Klassennamen).
 *
 * - `SCHWEBENDE` sind Dateien, die GANZ eine Ebene ueber dem Inhalt sind:
 *   Modals, Drawer, Lightbox, die Ueberlagerungs-Bausteine aus `ui/` und die
 *   schwebende Kopfleiste. Sie duerfen Glas und grosse Schatten tragen; das ist
 *   ihre Aufgabe. Jeder Eintrag nennt seinen Grund.
 * - Alles andere steht in `ALTLASTEN` und ist auf den Stand vom 09.11.2026
 *   eingefroren. Die Zahlen duerfen NUR SINKEN.
 * - Eine Datei, die in keiner der beiden Tabellen steht und eine der Klassen
 *   benutzt, bricht den Test. Das ist der eigentliche Zweck.
 *
 * KEINE PAUSCHALEN AUSNAHMEN
 * --------------------------
 * `SCHWEBENDE` ist eine Liste von Dateinamen, kein Pfadmuster. Ein Muster wie
 * `*Modal.tsx` waere kuerzer und wuerde jede kuenftige Datei mit diesem Namen
 * ungeprueft durchlassen — auch eine, die gar nicht schwebt.
 *
 * GRENZE DIESES WAECHTERS, ausdruecklich benannt
 * ---------------------------------------------
 * Er prueft je DATEI, nicht je Element. Eine Inhaltsdatei, die einen Dialog
 * INLINE enthaelt (`upload/ModelSolutionCard.tsx` tut das), kann Glas also
 * berechtigt brauchen. Solche Dateien stehen trotzdem in `ALTLASTEN` statt in
 * `SCHWEBENDE`: eingefroren ist strenger als freigestellt, und der Dialog
 * gehoert nach §7 ohnehin in ein Portal statt in die Karte.
 */

const SRC_DIR = join(process.cwd(), 'src');

/** `backdrop-blur`, `backdrop-blur-md`, `backdrop-blur-glass`, … */
const RE_GLAS = /\bbackdrop-blur(?:-[a-z0-9]+)?\b/g;

/**
 * Schatten oberhalb dessen, was Inhalt tragen darf.
 *
 * Nicht gezaehlt werden `shadow-sm`, `shadow-card` (der Kartenschatten-Token,
 * der die Haarlinie selbst mitbringt), `shadow-glass` (Modals), `shadow-lift`
 * (Produktbilder im Marketing) und `shadow-none`.
 */
const RE_SCHATTEN = /\bshadow-(?:lg|xl|2xl)\b/g;

/**
 * Dateien, die GANZ eine Ebene ueber dem Inhalt sind.
 * Ergaenzen nur mit Grund — und nur, wenn die ganze Datei schwebt.
 */
const SCHWEBENDE: Record<string, string> = {
    'components/AVVUploadModal.tsx': 'Modal',
    'components/AiParamsModal.tsx': 'Modal',
    'components/AiSetupModal.tsx': 'Modal',
    'components/ConfirmationModal.tsx': 'Modal (Rueckfrage-Dialog)',
    'components/CreditsModal.tsx': 'Modal',
    'components/ModelTypeModal.tsx': 'Modal',
    'components/OnboardingModal.tsx': 'Modal',
    'components/PDFSplitModal.tsx': 'Modal',
    'components/PDFTypeModal.tsx': 'Modal',
    'components/PromptSettingsModal.tsx': 'Modal',
    'components/PureKeyModal.tsx': 'Modal',
    'components/QuickStartModal.tsx': 'Modal',
    'components/RedactionModal.tsx': 'Modal',
    'components/SettingsModal.tsx': 'Modal',
    'components/SkillsSettingsModal.tsx': 'Modal',
    'components/admin/ComplianceAuditLog.tsx': 'Ganze Datei ist ein Modal ueber der Admin-Seite',
    'components/batch/AnalyticsModal.tsx': 'Modal',
    'components/batch/CalcTraceModal.tsx': 'Modal',
    'components/batch/DigitalSlipsModal.tsx': 'Modal',
    'components/batch/GradingGraphModal.tsx': 'Modal',
    'components/batch/GradingMemoryModal.tsx': 'Modal',
    'components/batch/parts/AnonymizeModal.tsx': 'Modal',
    'components/batch/parts/SecondOpinionDrawer.tsx': 'Drawer, faehrt ueber den Inhalt',
    'components/marketing/ImageLightbox.tsx': 'Lightbox ueber der Seite',
    'components/ui/Dropdown.tsx': 'Verankertes Menue — §5 nennt es als Vorbild',
    'components/ui/KorekiTooltip.tsx': 'Tooltip',
    'components/ui/PopoverMenu.tsx': 'Verankertes Menue',
    'components/ui/Toast.tsx': 'Meldung ueber dem Inhalt',
    'components/ui/FloatingActions.tsx': 'Schwebende Werkzeugleiste am Textabschnitt',
    'components/layout/AppHeader.tsx': 'Die schwebende Kopfleiste — §5 erlaubt sie ausdruecklich'
};

interface Altlast {
    /** Stellen mit `backdrop-blur*`. NUR SENKEN. */
    glas: number;
    /** Stellen mit `shadow-lg|xl|2xl`. NUR SENKEN. */
    schatten: number;
}

/**
 * Stand vom 09.11.2026, eingefroren. NUR SENKEN, NIE ERHOEHEN.
 *
 * Diese Dateien wurden beim Fund NICHT angesehen — sie liegen auf Oberflaechen
 * (Marketing, Compliance, Einstellungen, Erfahrungsschatz), die der Auftrag
 * nicht umfasste. Sie still umzubauen waere geraten, nicht gemessen. Wer eine
 * davon oeffnet, repariert sie und nimmt die Zeile heraus.
 *
 * Drei Gruppen fallen auf, falls jemand sie anfasst:
 *  - `CorrectionAnalytics.tsx` (5x Glas): Auswertungs-Kacheln, reiner Inhalt.
 *  - `MarketingHeader.tsx` / `MinimalFooter.tsx`: Unschaerfe an Kopf und Fuss,
 *    hinter denen nichts durchscrollt — Aufwand ohne Bild.
 *  - `GlobalBillingSettings.tsx` (2x): Inhaltskarten im Modal-Glas
 *    (`shadow-glass backdrop-blur-glass`), der deutlichste Fall der Liste.
 */
const ALTLASTEN: Record<string, Altlast> = {
    'components/AiConfigurationContent.tsx': { glas: 0, schatten: 1 },
    'components/avv-upload/StepDownload.tsx': { glas: 0, schatten: 1 },
    'components/avv-upload/StepSuccess.tsx': { glas: 0, schatten: 1 },
    'components/avv-upload/StepUpload.tsx': { glas: 0, schatten: 2 },
    'components/batch/BatchHeader.tsx': { glas: 0, schatten: 2 },
    'components/batch/CorrectionAnalytics.tsx': { glas: 5, schatten: 0 },
    'components/batch/ExportToolbar.tsx': { glas: 1, schatten: 1 },
    'components/batch/GradingMemoryCalibrateScreen.tsx': { glas: 0, schatten: 2 },
    'components/batch/GradingMemoryEditorView.tsx': { glas: 0, schatten: 1 },
    'components/batch/GradingMemoryStartScreen.tsx': { glas: 1, schatten: 1 },
    'components/batch/parts/GraphAiPanel.tsx': { glas: 0, schatten: 1 },
    'components/batch/parts/GraphEditorPanel.tsx': { glas: 0, schatten: 1 },
    'components/layout/HeaderBadges.tsx': { glas: 0, schatten: 1 },
    'components/layout/MarketingHeader.tsx': { glas: 1, schatten: 0 },
    'components/layout/MinimalFooter.tsx': { glas: 1, schatten: 0 },
    'components/settings/AiProfileSidebar.tsx': { glas: 1, schatten: 0 },
    'components/settings/GlobalBillingSettings.tsx': { glas: 2, schatten: 0 },
    'components/settings/MistralConfig.tsx': { glas: 0, schatten: 1 },
    'components/settings/OpenAICompatibleConfig.tsx': { glas: 0, schatten: 1 },
    'components/settings/ProfileModules.tsx': { glas: 1, schatten: 0 },
    'components/settings/SkillEditorPanel.tsx': { glas: 1, schatten: 1 },
    'components/settings/SkillsSidebar.tsx': { glas: 1, schatten: 0 },
    'components/upload/ModelSolutionCard.tsx': { glas: 1, schatten: 1 },
    'pages/app/compliance/agb.tsx': { glas: 1, schatten: 2 },
    'pages/app/compliance/avv.tsx': { glas: 1, schatten: 2 },
    'pages/app/compliance/manual.tsx': { glas: 1, schatten: 2 },
    'pages/app/compliance/tom.tsx': { glas: 1, schatten: 2 },
    'pages/contact.tsx': { glas: 0, schatten: 2 },
    'pages/desktop-setup.tsx': { glas: 0, schatten: 5 },
    'pages/org-admin.tsx': { glas: 0, schatten: 1 },
    'pages/view.tsx': { glas: 1, schatten: 4 }
};

const dateienUnter = (dir: string): string[] =>
    readdirSync(dir).flatMap(eintrag => {
        const pfad = join(dir, eintrag);
        return lstatSync(pfad).isDirectory() ? dateienUnter(pfad) : [pfad];
    });

const relativ = (pfad: string) => relative(SRC_DIR, pfad).split(sep).join('/');

/** Kommentare raus, bevor gezaehlt wird. */
const ohneKommentare = (inhalt: string) =>
    inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HINWEIS =
    '\n\nRegel (koreki-design-system §5):\n' +
    '  Glas und Unschaerfe nur fuer Ebenen, die UEBER Inhalt schweben.\n' +
    '  Inhaltskarten tragen hoechstens `shadow-sm` — oder `shadow-card`,\n' +
    '  der Token bringt die Haarlinie selbst mit und ersetzt den Rand.\n' +
    '  Modals `shadow-glass`, verankerte Popover `shadow-xl` auf `bg-card`.\n\n' +
    'Schwebt die ganze Datei (Modal, Drawer, Tooltip, Kopfleiste)?\n' +
    'JA   -> in SCHWEBENDE eintragen, mit Grund.\n' +
    'NEIN -> Klasse entfernen. Hinter einer Inhaltskarte liegt die einfarbige\n' +
    '        Seite: Die Unschaerfe kostet Rechenzeit und zeigt nichts.';

describe('Glass & Shadow Governance', () => {
    const gemessen = new Map<string, Altlast>();
    for (const pfad of dateienUnter(SRC_DIR).filter(f => /\.tsx?$/.test(f))) {
        const text = ohneKommentare(readFileSync(pfad, 'utf8'));
        const glas = (text.match(RE_GLAS) ?? []).length;
        const schatten = (text.match(RE_SCHATTEN) ?? []).length;
        if (glas > 0 || schatten > 0) gemessen.set(relativ(pfad), { glas, schatten });
    }

    it('laesst Glas und grosse Schatten nur in Dateien zu, die eingeordnet sind', () => {
        const unbekannt: string[] = [];

        gemessen.forEach(({ glas, schatten }, datei) => {
            if (SCHWEBENDE[datei] || ALTLASTEN[datei]) return;
            const was = [
                glas > 0 ? `${glas}x backdrop-blur` : '',
                schatten > 0 ? `${schatten}x shadow-lg/xl/2xl` : ''
            ].filter(Boolean).join(', ');
            unbekannt.push(`${datei}: ${was}`);
        });

        if (unbekannt.length > 0) {
            throw new Error(
                'GLAS ODER GROSSER SCHATTEN AN NICHT EINGEORDNETER STELLE:\n  - ' +
                unbekannt.join('\n  - ') + HINWEIS
            );
        }
    });

    it('laesst die eingefrorenen Altlasten nur schrumpfen', () => {
        const gewachsen: string[] = [];

        Object.entries(ALTLASTEN).forEach(([datei, eingefroren]) => {
            const jetzt = gemessen.get(datei) ?? { glas: 0, schatten: 0 };
            if (jetzt.glas > eingefroren.glas) {
                gewachsen.push(`${datei}: ${jetzt.glas}x backdrop-blur statt ${eingefroren.glas}x`);
            }
            if (jetzt.schatten > eingefroren.schatten) {
                gewachsen.push(
                    `${datei}: ${jetzt.schatten}x shadow-lg/xl/2xl statt ${eingefroren.schatten}x`
                );
            }
        });

        if (gewachsen.length > 0) {
            throw new Error(
                'ALTLAST GEWACHSEN — die Ratsche dreht nur in eine Richtung:\n  - ' +
                gewachsen.join('\n  - ') + HINWEIS
            );
        }
    });

    it('verlangt, dass reparierte Dateien die Altlasten-Liste verlassen', () => {
        const erledigt = Object.entries(ALTLASTEN)
            .filter(([datei, eingefroren]) => {
                const jetzt = gemessen.get(datei) ?? { glas: 0, schatten: 0 };
                return jetzt.glas < eingefroren.glas || jetzt.schatten < eingefroren.schatten;
            })
            .map(([datei, eingefroren]) => {
                const jetzt = gemessen.get(datei) ?? { glas: 0, schatten: 0 };
                return `${datei}: jetzt { glas: ${jetzt.glas}, schatten: ${jetzt.schatten} }, ` +
                    `eingetragen { glas: ${eingefroren.glas}, schatten: ${eingefroren.schatten} }`;
            });

        if (erledigt.length > 0) {
            throw new Error(
                'ALTLAST GESCHRUMPFT — bitte die Zahl nachziehen oder die Zeile entfernen:\n  - ' +
                erledigt.join('\n  - ') +
                '\n\nEine Ratsche, die nicht nachgezogen wird, gibt den Platz wieder frei.'
            );
        }
    });

    /**
     * Ein Schatten-Token darf nicht heissen wie eine Farbe.
     *
     * Gefunden am 09.11.2026, nachdem die beiden Hauptkarten auf `shadow-card`
     * umgestellt waren und danach GAR KEINEN Schatten mehr zeigten. `card` stand
     * in `boxShadow` UND in `colors`. Tailwind erzeugt fuer beide eine Regel mit
     * demselben Namen; die Farb-Regel setzt `--tw-shadow: var(--tw-shadow-colored)`
     * und faerbt den Schatten um. Ergebnis gemessen an der Karte
     * „Schuelerarbeiten": `rgb(255,255,255) 0px 0px 0px 1px` — weisser Schatten
     * auf weisser Karte, also nichts.
     *
     * Das ist dieselbe Fehlerklasse wie die tote `bg-card`-Klasse vom
     * 07.09.2026: kein Fehler, keine Warnung, kein Build-Abbruch — die Klasse
     * steht da und tut nicht, was ihr Name verspricht. Und es hatte dieselbe
     * Folge: Weil der Kartenschatten nichts zeigte, wurde an 50 Stellen
     * `shadow-xl`/`shadow-2xl` darueber gestapelt.
     */
    it('haelt Schatten-Tokens von Farb-Tokens getrennt', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const config = require(join(process.cwd(), 'tailwind.config.js'));
        const erweitert = config.theme?.extend ?? {};
        const schatten = Object.keys(erweitert.boxShadow ?? {});
        const farben = Object.keys(erweitert.colors ?? {});

        const kollision = schatten.filter(name => farben.includes(name));

        if (kollision.length > 0) {
            throw new Error(
                'SCHATTEN-TOKEN HEISST WIE EINE FARBE — der Schatten wird unsichtbar:\n  - ' +
                kollision.map(n => `\`${n}\`: steht in boxShadow UND in colors`).join('\n  - ') +
                '\n\nTailwind erzeugt fuer beide Tabellen eine Regel `shadow-<name>`.\n' +
                'Die Farb-Regel gewinnt und setzt `--tw-shadow: var(--tw-shadow-colored)`:\n' +
                'Die Geometrie bleibt, die Farbe wird die Token-Farbe. Bei einer hellen\n' +
                'Farbe auf hellem Grund sieht man danach nichts.\n\n' +
                'Schatten-Token umbenennen (Vorbild: `card` -> `raised`).'
            );
        }
    });

    it('verlangt fuer jede schwebende Datei einen Grund', () => {
        const ohneGrund = Object.entries(SCHWEBENDE)
            .filter(([, grund]) => grund.trim().length === 0)
            .map(([datei]) => datei);

        expect(ohneGrund).toEqual([]);
    });
});
