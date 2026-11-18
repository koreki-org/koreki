/**
 * Vorlagen der Handschrift-Demo — reine Daten, ohne Abhaengigkeiten, damit das
 * Erzeugungs-Skript (`scripts/demo-handschrift.ts`) sie ohne App-Umgebung lesen kann.
 *
 * Die Handschrift ist SIMULIERT: eine freie Handschrift-Schrift, jeder Buchstabe
 * einzeln verwackelt, dazu Papier und Scan-Look. Echte Schuelerblaetter kommen
 * hier nicht hin — auch keine abgeschriebenen (18.11.2026 so entschieden).
 *
 * Der Text MUSS woertlich dem der getippten Demo entsprechen (`demoScenario.ts`):
 * Die Bewertung dort ist durchgemessen, etwa liest Schueler #2 bewusst 1000 statt
 * 1200 ab und bekommt dafuer genau 2 von 3 Punkten. Ein Waechter
 * (`tests/unit/demo-handschrift.test.ts`) prueft das. Wer den Demo-Text aendert,
 * passt die Vorlage hier an und erzeugt die Bilder neu: `npm run demo:handschrift`.
 *
 * Auszeichnung im Text:
 *   `# Aufgabe 1`  Ueberschrift einer Aufgabe (unterstrichen)
 *   `~~Wort~~ `    durchgestrichen — gehoert NICHT zum Text, samt folgendem Leerzeichen
 *   `{^Wort}`      mit Einfuegezeichen ueber der Zeile nachgetragen — gehoert zum Text
 */

export type Papier = 'karo' | 'liniert';

export interface HandschriftStil {
    /** Google-Fonts-Familie (frei lizenziert, OFL). */
    schrift: string;
    /** Schriftgroesse in px bei 150 dpi. */
    groesse: number;
    /** Stiftdruck als Konturbreite in px. */
    druck: number;
    tinte: string;
    /** Grundneigung der Buchstaben in Grad. */
    neigung: number;
    /** Wie stark die Buchstaben wackeln (1 = krakelig). */
    wackeln: number;
    /**
     * Wie verschieden gleiche Buchstaben und Woerter aussehen (Neigung, Breite,
     * Stiftdruck, Groesse). Ohne sie wirkt eine ordentliche Schrift wie gedruckt.
     */
    vielfalt?: number;
    papier: Papier;
    /** Startwert des Zufalls — gleiche Vorlage ergibt dasselbe Bild. */
    startwert: number;
}

export interface HandschriftSeite {
    /** Dateiname unter `public/demo/handschrift/`. */
    datei: string;
    /** Wie in der getippten Demo. */
    name: string;
    originalName: string;
    /** Kopfzeile des Blatts (links Name, rechts Datum). */
    kopf: [string, string];
    stil: HandschriftStil;
    text: string;
}

export const HANDSCHRIFT_ORDNER = '/demo/handschrift';

export const HANDSCHRIFT_SEITEN: HandschriftSeite[] = [
    {
        datei: 'schueler-1.jpg',
        name: 'Schüler #1',
        originalName: 'Nele Beispielfeld',
        kopf: ['Name: Nele Beispielfeld', '18.11.'],
        stil: { schrift: 'Shadows Into Light', groesse: 38, druck: 0.35, tinte: '#22263a', neigung: 0, wackeln: 0.7, vielfalt: 1, papier: 'liniert', startwert: 3 },
        text: `
# Aufgabe 1
Ich nutze die Formel E = A · η · H.
Einsetzen: E = 40 m² · 0,2 · 1200 kWh/m²
E = 9600 kWh

# Aufgabe 2
Eine Solaranlage lohnt sich vor allem, weil man den Strom teurer verkaufen kann, als man ihn selbst einkaufen müsste. Für den Strom, den die Schule ins Netz einspeist, gibt es mehr Geld, als sie für Strom vom Anbieter zahlen würde — deswegen macht man damit Gewinn, egal wie viel man selbst verbraucht. Je mehr man einspeist, desto mehr verdient die Schule — deshalb sollte sie den Strom gar nicht selbst verbrauchen, sondern alles ins Netz geben.

# Aufgabe 3
Die Aussage stimmt teilweise. Eine einzelne Anlage auf einem Dach spart nur sehr wenig CO2 im Vergleich zu dem, was weltweit ausgestoßen wird. Trotzdem finde ich, dass es nicht „gar nichts“ bringt: Wenn viele Schulen das machen, kommt schon mehr zusammen, und die Schüler lernen dabei, wie sowas funktioniert. Das kann später mal wichtiger sein als der direkte CO2-Effekt.
`,
    },
    {
        datei: 'schueler-2.jpg',
        name: 'Schüler #2',
        originalName: 'Jonas Beispielfeld',
        kopf: ['Name: Jonas Beispielfeld', '18.11.'],
        stil: { schrift: 'Reenie Beanie', groesse: 37, druck: 0.55, tinte: '#1c2f7a', neigung: -2, wackeln: 1, papier: 'karo', startwert: 7 },
        text: `
# Aufgabe 1
Formel: E = A · η · H
Einsetzen: E = 40 m² · 0,2 · 1000 kWh/m²
E = 8000 kWh

# Aufgabe 2
Der größte ~~Nachteil~~ Vorteil ist, dass die Schule den Strom, den sie selbst erzeugt, auch {^direkt} selbst verbraucht. Dadurch muss sie weniger teuren Strom vom Netzbetreiber einkaufen, und genau diese Ersparnis macht den Hauptteil des Nutzens aus. Für überschüssigen Strom gibt es zwar eine Einspeisevergütung, die liegt heute aber unter dem Preis, den man für Netzstrom zahlt — damit allein würde sich die Anlage also nicht rechnen.

Außerdem macht sich die Schule unabhängiger von steigenden Strompreisen, weil ein Teil des Verbrauchs vom eigenen Dach kommt und nicht mehr eingekauft werden muss.

Dazu kommt der pädagogische Nutzen: Die Schule zeigt, dass sie das Thema Klimaschutz ernst nimmt, und wir können im Unterricht direkt an einer echten Anlage lernen, wie sowas funktioniert.

# Aufgabe 3
Weiß ich leider nicht.
`,
    },
];

/**
 * Alles, was das Bild bestimmt, als eine Zeichenkette. Das Skript legt ihren
 * Fingerabdruck neben die Bilder (`stand.json`); der Waechter vergleicht — so
 * faellt auf, wenn jemand die Vorlage aendert und das Neuerzeugen vergisst.
 */
export const vorlageSchluessel = (seite: HandschriftSeite): string =>
    JSON.stringify({ text: seite.text, kopf: seite.kopf, stil: seite.stil });

/**
 * Der Text, den das Blatt meint — in der Form der getippten Demo
 * (`=== TASK: Aufgabe n ===`). Durchgestrichenes faellt weg, Eingefuegtes zaehlt.
 */
export function alsDemoText(vorlage: string): string {
    return vorlage.trim().split('\n')
        .map(zeile => zeile.startsWith('# ') ? `=== TASK: ${zeile.slice(2)} ===` : zeile)
        .join('\n')
        .replace(/~~[^~]+~~ /g, '')
        .replace(/\{\^([^}]+)\}/g, '$1');
}
