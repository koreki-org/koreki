import { renderHook, act } from '@testing-library/react';
import { useCustomSkillCrud } from '../../../src/hooks/skills/useCustomSkillCrud';
import { apiClient } from '../../../src/lib/api-client';
import { isDesktopTarget } from '../../../src/lib/env-context';
import { useDashboardStore } from '../../../src/hooks/store/useDashboardStore';
import type { SkillProfile, CustomSkillDefinition, Task } from '../../../src/types';

jest.mock('../../../src/lib/api-client', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('../../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false),
    isLocalInstance: jest.fn(() => false)
}));
jest.mock('@/lib/ai/vault-service', () => ({ vaultService: { get: jest.fn(), set: jest.fn() } }));

/**
 * Eigene Skills anlegen und löschen (Layer 2)
 * 🧩🛡️
 *
 * Ein Skill lebt an DREI Stellen: in der Sammlung der Lehrkraft, in den
 * Skill-Sets, die ihn führen, und — falls er einen Bewertungsgraphen mitbringt
 * — in den Aufgaben der laufenden Sitzung.
 *
 * Bleibt beim Löschen eine davon stehen, verweist ein Set auf einen Skill, den
 * es nicht mehr gibt. Die Instruktion fällt beim nächsten Korrekturlauf
 * stillschweigend weg: kein Fehler, keine Meldung, nur eine Bewertung, die
 * anders ausfällt als beim letzten Mal.
 *
 * Der Hook war vollständig ungeprüft (0 % Zweigabdeckung).
 */

const skill = (id: string, p: Partial<CustomSkillDefinition> = {}): CustomSkillDefinition & { id: string } =>
    ({ id, name: `Skill ${id}`, promptSnippet: 'Anweisung', ...p });

const profil = (id: string, p: Partial<SkillProfile> = {}): SkillProfile => ({
    id,
    name: `Profil ${id}`,
    activeSkillIds: [],
    customSkills: {},
    ...p
});

const baue = (p: {
    profiles?: SkillProfile[];
    selectedProfileData?: SkillProfile;
    customSkills?: Record<string, CustomSkillDefinition>;
    activeSkillIds?: string[];
} = {}) => {
    const setCustomSkills = jest.fn();
    const setActiveSkillIds = jest.fn();
    const setProfiles = jest.fn();

    const { result } = renderHook(() => useCustomSkillCrud({
        customSkills: p.customSkills ?? {},
        setCustomSkills,
        activeSkillIds: p.activeSkillIds ?? [],
        setActiveSkillIds,
        profiles: p.profiles ?? [],
        setProfiles,
        selectedProfileData: p.selectedProfileData
    }));

    return { result, setCustomSkills, setActiveSkillIds, setProfiles };
};

/** Wendet den an `setCustomSkills` uebergebenen Aktualisierer an. */
const ergebnisVon = (mock: jest.Mock, vorher: unknown) => {
    const arg = mock.mock.calls[0][0];
    return typeof arg === 'function' ? arg(vorher) : arg;
};

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (isDesktopTarget as jest.Mock).mockReturnValue(false);
    (apiClient.post as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    useDashboardStore.setState({ tasksLayout: [] });
    window.confirm = jest.fn(() => true);
});

describe('Einen Skill anlegen', () => {
    it('nimmt ihn in die Sammlung auf und sichert sie', async () => {
        const { result, setCustomSkills } = baue();

        await act(async () => {
            await result.current.handleSaveCustomSkill(skill('neu'));
        });

        const sammlung = ergebnisVon(setCustomSkills as jest.Mock, {});
        expect(sammlung['neu']).toBeDefined();
        expect(localStorage.getItem('koreki_custom_skills')).toContain('neu');
    });

    /**
     * Der Skill muss auch im GEWAEHLTEN Set landen — sonst legt die Lehrkraft
     * ihn an, sieht ihn in der Liste und wundert sich, dass die Korrektur ihn
     * nicht anwendet.
     */
    it('sichert ihn sofort ins gewaehlte Set', async () => {
        const gewaehlt = profil('p1', { activeSkillIds: ['alt'] });
        const { result } = baue({ profiles: [gewaehlt], selectedProfileData: gewaehlt });

        await act(async () => {
            await result.current.handleSaveCustomSkill(skill('neu'));
        });

        expect(apiClient.post).toHaveBeenCalledWith('/api/user/skill-profiles',
            expect.objectContaining({
                id: 'p1',
                customSkills: expect.objectContaining({ neu: expect.anything() })
            }));
    });

    /** Vorlagen aus der Registry werden nie veraendert, sondern kopiert. */
    it('ruehrt eine System-Vorlage nicht an', async () => {
        const vorlage = profil('sys', { isSystem: true });
        const { result } = baue({ profiles: [vorlage], selectedProfileData: vorlage });

        await act(async () => {
            await result.current.handleSaveCustomSkill(skill('neu'));
        });

        expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('kommt ohne gewaehltes Set zurecht', async () => {
        const { result, setCustomSkills } = baue();

        await act(async () => {
            await result.current.handleSaveCustomSkill(skill('neu'));
        });

        expect(setCustomSkills).toHaveBeenCalled();
        expect(apiClient.post).not.toHaveBeenCalled();
    });

    /**
     * DIE BRUECKE IN DIE LAUFENDE SITZUNG. Aendert die Lehrkraft den
     * Bewertungsgraphen eines Skills, muessen die Aufgaben, die ihn benutzen,
     * den neuen Graphen sofort tragen — sonst bewertet der naechste Durchlauf
     * noch nach der alten Fassung.
     */
    it('zieht den geaenderten Graphen in die Aufgaben der Sitzung nach', async () => {
        useDashboardStore.setState({
            tasksLayout: [
                { name: 'A1', taskType: 'mein-skill' } as Task,
                { name: 'A2', taskType: 'anderer' } as Task
            ]
        });
        const { result } = baue();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const neuerGraph = { taskId: 'g', discipline: 'x', variables: [] } as any;

        await act(async () => {
            await result.current.handleSaveCustomSkill(skill('mein-skill', { gradingGraph: neuerGraph }));
        });

        const aufgaben = useDashboardStore.getState().tasksLayout;
        expect(aufgaben[0].gradingGraph).toBe(neuerGraph);
        expect(aufgaben[1].gradingGraph).toBeUndefined();
    });

    it('bricht nicht ab, wenn das Sichern ins Set fehlschlaegt', async () => {
        (apiClient.post as jest.Mock).mockRejectedValue(new Error('offline'));
        const gewaehlt = profil('p1');
        const { result, setCustomSkills } = baue({ profiles: [gewaehlt], selectedProfileData: gewaehlt });

        await act(async () => {
            await result.current.handleSaveCustomSkill(skill('neu'));
        });

        // Die Sammlung ist trotzdem aktualisiert — der Skill ist nicht verloren.
        expect(setCustomSkills).toHaveBeenCalled();
    });
});

describe('Einen Skill loeschen', () => {
    const mitSkill = () => ({
        customSkills: { weg: skill('weg'), bleibt: skill('bleibt') },
        activeSkillIds: ['weg', 'bleibt'],
        profiles: [
            profil('p1', { activeSkillIds: ['weg'], customSkills: { weg: skill('weg') } }),
            profil('p2', { activeSkillIds: ['bleibt'], customSkills: { bleibt: skill('bleibt') } }),
            profil('sys', { isSystem: true, activeSkillIds: ['weg'] })
        ]
    });

    it('nimmt ihn aus der Sammlung und sichert sie', async () => {
        const { result, setCustomSkills } = baue(mitSkill());

        await act(async () => {
            await result.current.handleDeleteCustomSkill('weg');
        });

        const sammlung = ergebnisVon(setCustomSkills as jest.Mock, mitSkill().customSkills);
        expect(sammlung['weg']).toBeUndefined();
        expect(sammlung['bleibt']).toBeDefined();
    });

    /** Bleibt die Kennung stehen, verweist das Set auf einen Skill ohne Inhalt. */
    it('nimmt seine Kennung aus der laufenden Auswahl', async () => {
        const { result, setActiveSkillIds } = baue(mitSkill());

        await act(async () => {
            await result.current.handleDeleteCustomSkill('weg');
        });

        expect(setActiveSkillIds).toHaveBeenCalledWith(['bleibt']);
    });

    it('nimmt ihn aus allen eigenen Sets heraus', async () => {
        const { result, setProfiles } = baue(mitSkill());

        await act(async () => {
            await result.current.handleDeleteCustomSkill('weg');
        });

        const sets = setProfiles.mock.calls[0][0] as SkillProfile[];
        expect(sets[0].activeSkillIds).toEqual([]);
        expect(sets[0].customSkills).toEqual({});
        expect(sets[1].activeSkillIds).toEqual(['bleibt']);
    });

    it('laesst System-Vorlagen unveraendert', async () => {
        const { result, setProfiles } = baue(mitSkill());

        await act(async () => {
            await result.current.handleDeleteCustomSkill('weg');
        });

        const sets = setProfiles.mock.calls[0][0] as SkillProfile[];
        expect(sets[2].activeSkillIds).toEqual(['weg']);
    });

    /**
     * Nur die betroffenen Sets gehen an den Server. Alle zu schicken kostete
     * je Set einen Schreibvorgang und ueberschriebe nebenbei Aenderungen, die
     * inzwischen von anderer Stelle kamen.
     */
    it('schickt nur die Sets an den Server, die ihn wirklich fuehrten', async () => {
        const { result } = baue(mitSkill());

        await act(async () => {
            await result.current.handleDeleteCustomSkill('weg');
        });

        expect(apiClient.post).toHaveBeenCalledTimes(1);
        expect((apiClient.post as jest.Mock).mock.calls[0][1].name).toBe('Profil p1');
    });

    it('schreibt im Desktop-Betrieb in die lokale Ablage statt ans Netz', async () => {
        (isDesktopTarget as jest.Mock).mockReturnValue(true);
        localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(mitSkill().profiles));
        const { result } = baue(mitSkill());

        await act(async () => {
            await result.current.handleDeleteCustomSkill('weg');
        });

        expect(apiClient.post).not.toHaveBeenCalled();
        const abgelegt = JSON.parse(localStorage.getItem('koreki_local_skill_profiles')!);
        expect(abgelegt[0].activeSkillIds).toEqual([]);
    });

    it('kommt mit einer unlesbaren lokalen Ablage zurecht', async () => {
        (isDesktopTarget as jest.Mock).mockReturnValue(true);
        localStorage.setItem('koreki_local_skill_profiles', 'kein JSON');
        const { result, setProfiles } = baue(mitSkill());

        await act(async () => {
            await result.current.handleDeleteCustomSkill('weg');
        });

        // Der Zustand ist trotzdem bereinigt.
        expect(setProfiles).toHaveBeenCalled();
    });
});
