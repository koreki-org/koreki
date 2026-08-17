import { create, all, type MathJsInstance } from 'mathjs';

/**
 * Die eine mathjs-Instanz der Bewertungs-Engine.
 * 🧮
 *
 * Bewusst GETEILT und nicht je Modul neu erzeugt: `createUnit` registriert die
 * Währungen unten auf der INSTANZ. Eine zweite Instanz kennte sie nicht — ein
 * Betrag in Euro liesse sich dort nicht mehr mit einem in Euro vergleichen,
 * ohne dass irgendwo ein Fehler auftauchte.
 *
 * Die Registrierung stand vorher als Seiteneffekt am Kopf von `CalcTrace.ts`.
 * Hier ist sie sichtbar an die Instanz gebunden, zu der sie gehört.
 */
export const math: MathJsInstance = create(all);

try {
    math.createUnit('EUR', { aliases: ['euro', 'euros'] });
    math.createUnit('USD', { aliases: ['dollar', 'dollars'] });
    math.createUnit('CHF', { aliases: ['chf'] });
} catch {
    // Bereits registriert — bei doppeltem Laden des Moduls unkritisch.
}
