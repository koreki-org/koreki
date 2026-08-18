import { networkPlugin, ipToLong, longToIp } from '../../../src/lib/grading/plugins';

/**
 * Netzwerk-Mathematik der VLSM-Bewertung (Layer 1)
 * 🌐⚖️
 *
 * Diese Funktionen rechnen die ERWARTETEN Werte einer Subnetz-Aufgabe aus.
 * Sind sie falsch, ist die Musterlösung falsch — und jede Schülerin, die
 * richtig gerechnet hat, gilt als falsch. Lautlos, weil die Zahlen plausibel
 * aussehen.
 *
 * GEFUNDENER FEHLER, 18.08.2026 — beim Lesen.
 * Das Prompt-Schema erlaubt dem Modell ausdrücklich, einen `defaultValue` als
 * TEXT zu liefern, und der Parser reicht ihn unverändert weiter. `mathPlugin`
 * hat das immer berücksichtigt, `networkPlugin` nicht:
 *
 *   calculateMask(50)   → "/26"   richtig
 *   calculateMask("50") → "/23"   falsch, weil "50" + 2 die Zeichenkette
 *                                 "502" ergibt
 *
 * Ein Netz mit 8-facher Größe. Und die gesamte Zeile danach — Netz-ID,
 * Broadcast, erster und letzter Host — baut auf dieser Maske auf.
 */

// Damit die Tests absichtlich falsche Typen schicken dürfen.
const netz = networkPlugin as unknown as {
    calculateMask: (hosts: unknown) => string;
    calculateSize: (mask: unknown) => number;
    calculateNetId: (netId: string, mask: unknown) => string;
    calculateBroadcast: (netId: string, mask: unknown) => string;
    calculateFirstHost: (netId: string) => string;
    calculateLastHost: (netId: string, mask: unknown) => string;
    calculateGateway: (netId: string, mask: unknown) => string;
};

describe('Maske aus der Host-Zahl', () => {
    /**
     * DER GEMELDETE FALL. Zahl und Text müssen dasselbe ergeben — sonst
     * entscheidet der Zufall der Modell-Ausgabe über die Bewertung.
     */
    it.each([
        [1, '/30'],
        [2, '/30'],
        [6, '/29'],
        [50, '/26'],
        [62, '/26'],
        [126, '/25'],
        [254, '/24'],
        [255, '/23']
    ])('rechnet %s Hosts zu %s — als Zahl UND als Text', (hosts, erwartet) => {
        expect(netz.calculateMask(hosts)).toBe(erwartet);
        expect(netz.calculateMask(String(hosts))).toBe(erwartet);
    });

    /**
     * Die zwei reservierten Adressen (Netz-ID und Broadcast) gehören dazu.
     * 62 Hosts passen in ein /26 (64 Adressen), 63 nicht mehr.
     */
    it('rechnet die beiden reservierten Adressen mit ein', () => {
        expect(netz.calculateMask(62)).toBe('/26');
        expect(netz.calculateMask(63)).toBe('/25');
    });

    /** Unsinn bricht ab, statt eine plausible falsche Maske zu liefern. */
    it.each(['viele', '', null, undefined, {}])('bricht bei %s ab', (unsinn) => {
        expect(() => netz.calculateMask(unsinn)).toThrow();
    });

    it('bricht bei negativer Host-Zahl ab', () => {
        expect(() => netz.calculateMask(-5)).toThrow(/negativ/);
    });

    it('bricht ab, wenn die Host-Zahl in kein IPv4-Netz passt', () => {
        expect(() => netz.calculateMask(2 ** 33)).toThrow(/IPv4/);
    });
});

describe('Groesse einer Maske', () => {
    it.each([
        ['/24', 256],
        ['/26', 64],
        ['/30', 4],
        ['/32', 1],
        ['/0', 4294967296]
    ])('rechnet %s zu %s Adressen', (maske, groesse) => {
        expect(netz.calculateSize(maske)).toBe(groesse);
    });

    /** Auch eine blanke Zahl kommt vor — vorher stürzte das ab. */
    it('nimmt die Maske auch ohne Schraegstrich', () => {
        expect(netz.calculateSize(24)).toBe(256);
        expect(netz.calculateSize('24')).toBe(256);
    });

    it.each(['/33', '/-1', 'keine Maske', null])('lehnt %s ab', (unsinn) => {
        expect(() => netz.calculateSize(unsinn)).toThrow();
    });
});

describe('Adressen eines Subnetzes', () => {
    it('rechnet Broadcast, ersten und letzten Host', () => {
        expect(netz.calculateBroadcast('192.168.1.0', '/24')).toBe('192.168.1.255');
        expect(netz.calculateFirstHost('192.168.1.0')).toBe('192.168.1.1');
        expect(netz.calculateLastHost('192.168.1.0', '/24')).toBe('192.168.1.254');
    });

    /** Das Gateway ist voreingestellt der letzte nutzbare Host. */
    it('setzt das Gateway auf den letzten Host', () => {
        expect(netz.calculateGateway('10.0.0.0', '/28'))
            .toBe(netz.calculateLastHost('10.0.0.0', '/28'));
    });

    /** Das nächste Netz beginnt genau hinter dem vorigen. */
    it('rechnet die naechste Netz-ID', () => {
        expect(netz.calculateNetId('192.168.1.0', '/26')).toBe('192.168.1.64');
        expect(netz.calculateNetId('192.168.1.192', '/26')).toBe('192.168.2.0');
    });

    /**
     * Die Kette muss aufgehen: das nächste Netz beginnt eine Adresse hinter dem
     * Broadcast des vorigen. Wer hier danebenliegt, verschiebt jede folgende
     * Zeile der Aufgabe.
     */
    it('schliesst luekenlos an den vorigen Broadcast an', () => {
        const broadcast = netz.calculateBroadcast('172.16.0.0', '/22');
        const naechstes = netz.calculateNetId('172.16.0.0', '/22');

        expect(ipToLong(naechstes)).toBe(ipToLong(broadcast) + 1);
    });

    /** Auch hier: die Maske darf als Text ODER als Zahl kommen. */
    it('rechnet mit der Maske als Zahl genauso', () => {
        expect(netz.calculateBroadcast('192.168.1.0', 24)).toBe('192.168.1.255');
        expect(netz.calculateNetId('192.168.1.0', 26)).toBe('192.168.1.64');
    });
});

describe('IP-Umrechnung', () => {
    /**
     * Adressen ab 128 im ersten Byte haben das oberste Bit gesetzt. Die
     * Zwischenzahl ist dadurch negativ — der Rückweg muss sie trotzdem richtig
     * auflösen, sonst wäre jede Adresse ab 128.x.x.x betroffen.
     */
    it.each([
        '0.0.0.0',
        '10.0.0.1',
        '127.255.255.255',
        '128.0.0.0',
        '192.168.1.42',
        '255.255.255.255'
    ])('fuehrt %s unveraendert hin und zurueck', (ip) => {
        expect(longToIp(ipToLong(ip))).toBe(ip);
    });

    it.each(['192.168.1', '192.168.1.1.1', 'keine.ip.hier.x', ''])('lehnt %s ab', (unsinn) => {
        expect(() => ipToLong(unsinn)).toThrow(/Invalid IP/);
    });
});
