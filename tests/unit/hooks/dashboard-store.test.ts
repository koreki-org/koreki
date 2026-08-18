import { useDashboardStore } from '../../../src/hooks/store/useDashboardStore';
import { isLocalInstance } from '../../../src/lib/env-context';
import type { Task, AppSettings } from '../../../src/types';

jest.mock('../../../src/lib/env-context', () => ({ isLocalInstance: jest.fn(() => false) }));
jest.mock('@/lib/ai/vault-service', () => ({ vaultService: { get: jest.fn(), set: jest.fn() } }));

/**
 * Der Zustandsspeicher des Dashboards (Layer 1)
 * 🗄️🛡️
 *
 * Zwei sehr verschiedene Dinge liegen hier zusammen, und beide waren ungeprueft
 * (7,8 % Zweigabdeckung):
 *
 * 1. DIE SETZER. Jeder nimmt entweder einen Wert oder eine Funktion, die aus
 *    dem vorigen Stand den neuen macht. Die abgeleitete Form ist kein Luxus:
 *    wer EINE Aufgabe aendert, muss die anderen kennen. Ein Setzer, der nur
 *    Werte annimmt, machte aus so einer Funktion still die neue Aufgabenliste
 *    — genau das hat `strict: true` am 18.08.2026 in `UploadGrid` aufgedeckt.
 *
 * 2. DIE ABLAGE DER KI-EINSTELLUNGEN. Sie schreibt in den localStorage — aber
 *    ausdruecklich OHNE die Anbieter-Schluessel. Ein Schluessel im
 *    localStorage waere fuer jedes Skript auf der Seite lesbar und ueberlebte
 *    das Abmelden. Diese Zusicherung stand nur als Kommentar da.
 */

const aufgabe = (name: string): Task => ({ name, maxPoints: 1 } as Task);

const zuruecksetzen = () => {
    useDashboardStore.setState({
        modelSolution: '',
        modelSolutionContext: '',
        tasksLayout: [],
        aiSettings: { provider: 'mistral', mistralKey: '' },
        isHydrated: false
    });
};

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (isLocalInstance as jest.Mock).mockReturnValue(false);
    zuruecksetzen();
});

describe('Setzer: Wert oder Ableitung', () => {
    it('nimmt einen Wert entgegen', () => {
        useDashboardStore.getState().setModelSolution('Die Musterlösung');

        expect(useDashboardStore.getState().modelSolution).toBe('Die Musterlösung');
    });

    /**
     * DIE FORM, die der verengte Typ in `UploadGrid` still zerstoert haette:
     * die Funktion waere dort zur neuen Aufgabenliste geworden.
     */
    it('nimmt eine Ableitung aus dem vorigen Stand entgegen', () => {
        const { setTasksLayout } = useDashboardStore.getState();
        setTasksLayout([aufgabe('A'), aufgabe('B')]);

        setTasksLayout(prev => prev.map(t => t.name === 'B' ? { ...t, maxPoints: 5 } : t));

        const jetzt = useDashboardStore.getState().tasksLayout;
        expect(jetzt).toHaveLength(2);
        expect(jetzt[1].maxPoints).toBe(5);
        expect(jetzt[0].maxPoints).toBe(1);
    });

    it('reicht der Ableitung den AKTUELLEN Stand herein', () => {
        const { setModelSolution } = useDashboardStore.getState();
        setModelSolution('erste');

        let gesehen = '';
        setModelSolution(prev => { gesehen = prev; return prev + ' zweite'; });

        expect(gesehen).toBe('erste');
        expect(useDashboardStore.getState().modelSolution).toBe('erste zweite');
    });

    it('laesst die uebrigen Felder unberuehrt', () => {
        const { setModelSolution, setModelSolutionContext } = useDashboardStore.getState();
        setModelSolutionContext('Der Rahmen');
        setModelSolution('Die Lösung');

        expect(useDashboardStore.getState().modelSolutionContext).toBe('Der Rahmen');
    });
});

describe('KI-Einstellungen ablegen', () => {
    const einstellungen = (p: Partial<AppSettings> = {}): AppSettings =>
        ({ provider: 'mistral', ...p }) as AppSettings;

    /**
     * DIE SICHERHEITSZUSICHERUNG.
     *
     * Ein Anbieter-Schluessel im localStorage waere fuer jedes Skript auf der
     * Seite lesbar und ueberlebte das Abmelden. Er gehoert in den Tresor
     * (`vaultService`), nicht hierher. Die Regel stand bisher nur als Kommentar
     * ueber der Ablage — jetzt faellt ihr Bruch auf.
     */
    it('legt Anbieter-Schluessel NIEMALS im localStorage ab', () => {
        (isLocalInstance as jest.Mock).mockReturnValue(true);

        useDashboardStore.getState().setAiSettings(einstellungen({
            mistralKey: 'sk-geheim-mistral',
            openaiKey: 'sk-geheim-openai',
            ollamaModel: 'qwen3:8b'
        }));

        const alles = JSON.stringify(localStorage);
        expect(alles).not.toContain('sk-geheim-mistral');
        expect(alles).not.toContain('sk-geheim-openai');
        // Die unkritischen Angaben werden dagegen sehr wohl gesichert.
        expect(localStorage.getItem('koreki_ollama_model')).toBe('qwen3:8b');
    });

    /**
     * Im SaaS gibt es keine lokale Ablage — die Einstellungen gehoeren dem
     * Nutzerkonto. Wuerde hier geschrieben, bliebe der Stand eines Nutzers auf
     * einem geteilten Rechner stehen.
     */
    it('schreibt im Server-Betrieb gar nicht in den localStorage', () => {
        (isLocalInstance as jest.Mock).mockReturnValue(false);

        useDashboardStore.getState().setAiSettings(einstellungen({ ollamaModel: 'qwen3:8b' }));

        expect(localStorage.getItem('koreki_ollama_model')).toBeNull();
        expect(useDashboardStore.getState().aiSettings.ollamaModel).toBe('qwen3:8b');
    });

    it('nimmt auch hier eine Ableitung entgegen', () => {
        const { setAiSettings } = useDashboardStore.getState();
        setAiSettings(einstellungen({ temperature: 0.2 }));

        setAiSettings(prev => ({ ...prev, topP: 0.9 }));

        const jetzt = useDashboardStore.getState().aiSettings;
        expect(jetzt.temperature).toBe(0.2);
        expect(jetzt.topP).toBe(0.9);
    });

    /**
     * Die Adresse des lokalen Modells geht als Cookie mit, damit der Server sie
     * beim Proxy-Aufruf kennt. Wird sie geleert, muss das Cookie WEG — sonst
     * spricht der Server weiter einen Rechner an, den die Lehrkraft entfernt
     * hat.
     */
    it('setzt und loescht das Ollama-Cookie', () => {
        const { setAiSettings } = useDashboardStore.getState();

        setAiSettings(einstellungen({ ollamaUrl: 'http://127.0.0.1:11434' }));
        expect(document.cookie).toContain('koreki_ollama_url');

        setAiSettings(einstellungen({ ollamaUrl: '' }));
        expect(document.cookie).not.toContain('11434');
    });

    /** Eine leere Kennung heisst „kein Profil aktiv" und muss den Eintrag entfernen. */
    it('entfernt die Profilkennung, wenn sie geleert wird', () => {
        (isLocalInstance as jest.Mock).mockReturnValue(true);
        const { setAiSettings } = useDashboardStore.getState();

        setAiSettings(einstellungen({ activeAiProfileId: 'profil-1' }));
        expect(localStorage.getItem('koreki_active_ai_profile_id')).toBe('profil-1');

        setAiSettings(einstellungen({ activeAiProfileId: '' }));
        expect(localStorage.getItem('koreki_active_ai_profile_id')).toBeNull();
    });

    /**
     * `0` ist ein gueltiger Wert — er heisst „Kontextfenster vom Server
     * bestimmen lassen". Eine Pruefung auf Wahrheitswert statt auf `undefined`
     * verloere ihn.
     */
    it('sichert auch eine gesetzte Null', () => {
        (isLocalInstance as jest.Mock).mockReturnValue(true);

        useDashboardStore.getState().setAiSettings(einstellungen({
            ollamaNumCtx: 0, temperature: 0
        }));

        expect(localStorage.getItem('koreki_ollama_num_ctx')).toBe('0');
        expect(localStorage.getItem('koreki_openai_temperature')).toBe('0');
    });
});
