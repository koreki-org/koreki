import {
    pruefeProfilGrenze,
    pruefeSkillGrenze,
    istUnbegrenzt,
    FREI_GRENZE,
    GRENZE_MARKER
} from '@/lib/services/profile-limits';
import { toProfileHttpError } from '@/lib/services/profile-naming';

/**
 * Mengengrenze der Profil-Familien (Layer 1)
 * 📦🛡️
 *
 * Der Experten-Modus stand frueher VOR den vier Modalen und traf ausgerechnet
 * den, der sich gerade fuer einen bezahlten Modus entschieden hatte. Jetzt sind
 * die Modale offen und die MENGE ist begrenzt.
 *
 * Die entscheidende Eigenschaft ist nicht die Sperre, sondern was sie NICHT
 * tut: Sie greift nur beim Neuanlegen. Wer an der Grenze steht, muss sein
 * bestehendes Profil weiter speichern koennen — sonst haette die Regel jemandem
 * seine eigene Arbeit weggesperrt.
 */
const NUTZER = { rolle: 'USER' };

describe('pruefeProfilGrenze', () => {
    it('laesst den ersten eigenen Eintrag durch', () => {
        expect(() => pruefeProfilGrenze('EXPERTISE', 0, NUTZER)).not.toThrow();
    });

    it('sperrt, sobald die Grenze erreicht ist', () => {
        expect(() => pruefeProfilGrenze('EXPERTISE', FREI_GRENZE, NUTZER)).toThrow();
    });

    it('nennt die Familie und den Weg heraus', () => {
        // Ohne die Familie liest die Lehrkraft eine Meldung, die zu jedem der
        // vier Modale passen wuerde — und weiss nicht, was sie aufraeumen soll.
        expect(() => pruefeProfilGrenze('ERFAHRUNG', FREI_GRENZE, NUTZER)).toThrow(/Erfahrungsschatz/);
        expect(() => pruefeProfilGrenze('ERFAHRUNG', FREI_GRENZE, NUTZER)).toThrow(new RegExp(GRENZE_MARKER));
    });

    it.each(['EXPERTISE', 'SKILLS', 'ERFAHRUNG', 'KI'] as const)(
        'gilt fuer %s gleichermassen',
        (familie) => {
            expect(() => pruefeProfilGrenze(familie, FREI_GRENZE, NUTZER)).toThrow();
        }
    );
});

describe('Wer die Grenze nicht spuert', () => {
    it.each(['EXPERTE', 'ADMIN'])('%s hat sie freigeschaltet', (rolle) => {
        expect(istUnbegrenzt({ rolle })).toBe(true);
        expect(() => pruefeProfilGrenze('KI', 999, { rolle })).not.toThrow();
    });

    /**
     * Eine Schule zahlt fuer ihre Lehrkraefte. Sie danach einzeln zum
     * Freischalten zu schicken waere zweimal kassieren fuer dieselbe Sache.
     */
    it('ein Instituts-Mitglied auch ohne eigene Rolle', () => {
        const kontext = { rolle: 'USER', imInstitut: true };

        expect(istUnbegrenzt(kontext)).toBe(true);
        expect(() => pruefeProfilGrenze('SKILLS', 42, kontext)).not.toThrow();
    });

    it('ein einfacher Nutzer dagegen schon', () => {
        expect(istUnbegrenzt({ rolle: 'USER', imInstitut: false })).toBe(false);
        expect(istUnbegrenzt({ rolle: 'USER' })).toBe(false);
    });
});

describe('pruefeSkillGrenze', () => {
    const skills = (anzahl: number) =>
        Object.fromEntries(Array.from({ length: anzahl }, (_, i) => [`skill-${i}`, {}]));

    it('laesst die erlaubte Menge durch', () => {
        expect(() => pruefeSkillGrenze(skills(FREI_GRENZE), NUTZER)).not.toThrow();
    });

    it('sperrt einen darueber', () => {
        expect(() => pruefeSkillGrenze(skills(FREI_GRENZE + 1), NUTZER)).toThrow(/Skill/);
    });

    it('kommt mit fehlenden Angaben zurecht', () => {
        expect(() => pruefeSkillGrenze(undefined, NUTZER)).not.toThrow();
        expect(() => pruefeSkillGrenze(null, NUTZER)).not.toThrow();
    });

    it('kennt fuer Experten keine Grenze', () => {
        expect(() => pruefeSkillGrenze(skills(50), { rolle: 'EXPERTE' })).not.toThrow();
    });
});

/**
 * Die Meldung muss beim Nutzer als Tarifgrenze ankommen, nicht als Panne.
 * Ohne diese Abbildung faellt sie in den Sammel-`catch` der Routen und wird zu
 * einem 500 „Interner Serverfehler" — der Nutzer sucht dann einen Defekt, wo
 * eine Entscheidung von ihm gefragt ist.
 */
describe('HTTP-Abbildung der Grenze', () => {
    it('antwortet mit 403 und der fachlichen Meldung', () => {
        let gefangen: unknown;
        try {
            pruefeProfilGrenze('SKILLS', FREI_GRENZE, NUTZER);
        } catch (err) {
            gefangen = err;
        }

        const antwort = toProfileHttpError(gefangen, 'Fallback', 'Skill-Set');
        expect(antwort.status).toBe(403);
        expect(antwort.message).toMatch(new RegExp(GRENZE_MARKER));
    });
});
