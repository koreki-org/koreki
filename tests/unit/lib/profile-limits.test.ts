import {
    pruefeProfilGrenze,
    pruefeSkillGrenze,
    PROFIL_GRENZE,
    SKILL_GRENZE,
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
describe('pruefeProfilGrenze', () => {
    it('laesst den ersten eigenen Eintrag durch', () => {
        expect(() => pruefeProfilGrenze('EXPERTISE', 0, 'USER')).not.toThrow();
    });

    it('sperrt, sobald die Grenze erreicht ist', () => {
        expect(() => pruefeProfilGrenze('EXPERTISE', PROFIL_GRENZE, 'USER')).toThrow();
    });

    it('nennt die Familie und den Weg heraus', () => {
        // Ohne die Familie liest die Lehrkraft eine Meldung, die zu jedem der
        // vier Modale passen wuerde — und weiss nicht, was sie aufraeumen soll.
        expect(() => pruefeProfilGrenze('ERFAHRUNG', PROFIL_GRENZE, 'USER'))
            .toThrow(/Erfahrungsschatz/);
        expect(() => pruefeProfilGrenze('ERFAHRUNG', PROFIL_GRENZE, 'USER'))
            .toThrow(new RegExp(GRENZE_MARKER));
    });

    it.each(['EXPERTISE', 'SKILLS', 'ERFAHRUNG', 'KI'] as const)(
        'gilt fuer %s gleichermassen',
        (familie) => {
            expect(() => pruefeProfilGrenze(familie, PROFIL_GRENZE, 'USER')).toThrow();
        }
    );

    it.each(['EXPERTE', 'ADMIN'])('kennt fuer %s keine Grenze', (rolle) => {
        expect(() => pruefeProfilGrenze('KI', 999, rolle)).not.toThrow();
    });
});

describe('pruefeSkillGrenze', () => {
    const skills = (anzahl: number) =>
        Object.fromEntries(Array.from({ length: anzahl }, (_, i) => [`skill-${i}`, {}]));

    it('laesst die erlaubte Menge durch', () => {
        expect(() => pruefeSkillGrenze(skills(SKILL_GRENZE), 'USER')).not.toThrow();
    });

    it('sperrt einen darueber', () => {
        expect(() => pruefeSkillGrenze(skills(SKILL_GRENZE + 1), 'USER')).toThrow(/Skill/);
    });

    it('kommt mit fehlenden Angaben zurecht', () => {
        expect(() => pruefeSkillGrenze(undefined, 'USER')).not.toThrow();
        expect(() => pruefeSkillGrenze(null, 'USER')).not.toThrow();
    });

    it('kennt fuer Experten keine Grenze', () => {
        expect(() => pruefeSkillGrenze(skills(50), 'EXPERTE')).not.toThrow();
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
            pruefeProfilGrenze('SKILLS', PROFIL_GRENZE, 'USER');
        } catch (err) {
            gefangen = err;
        }

        const antwort = toProfileHttpError(gefangen, 'Fallback', 'Skill-Set');
        expect(antwort.status).toBe(403);
        expect(antwort.message).toMatch(new RegExp(GRENZE_MARKER));
    });
});
