/**
 * Koreki Legal Contact Configuration ⚖️
 * Use environment variables to keep your personal data out of the public repository.
 */
export const LEGAL_CONFIG = {
    /**
     * Der ANBIETER des Systems im Sinne der KI-Verordnung — wer Koreki entwickelt und
     * unter eigenem Namen bereitstellt. Diese Rolle wandert NICHT mit dem Server:
     * Eine Schule, die die Desktop- oder Community-Fassung unveraendert einsetzt, ist
     * Betreiber, nicht Anbieter (Betriebsanleitung, Abschnitt 2).
     *
     * Bewusst getrennt von `controller` (05.09.2026). Vorher gab es nur EINEN Satz
     * Kontaktdaten: Die Betriebsanleitung nannte ihn "Anbieter", gefuellt wurde er aber
     * mit den Angaben dessen, der die Instanz betreibt. Der Anbieter der Software kam
     * darin gar nicht vor — und ohne ihn fehlt der Betriebsanleitung die Angabe, die
     * Artikel 13 verlangt.
     *
     * Bewusst FESTE WERTE und keine Umgebungsvariablen: Der Anbieter ist die Marke,
     * nicht eine Person. Daran ist nichts vertraulich, also braucht es weder Secrets
     * noch Bau-Zeit-Einsetzung. Die vollstaendigen Angaben zur dahinterstehenden
     * Person stehen im Impressum — eine Adresse gehoert dorthin und nicht in jede
     * ausgelieferte Programmdatei.
     *
     * Wer Koreki unter eigenem Namen ausbringt, wird selbst Anbieter und aendert diese
     * Zeilen — er veraendert den Quellcode ohnehin.
     */
    provider: {
        name: "Koreki",
        email: "info@koreki.org",
        web: "https://koreki.org",
        imprint: "https://koreki.org/impressum",
    },

    /** Wer DIESE Instanz betreibt. Fuellt Impressum, Datenschutz und die Vertraege. */
    controller: {
        name: process.env.NEXT_PUBLIC_LEGAL_NAME || "[Name des Verantwortlichen]",
        address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "[Straße, Hausnummer, PLZ, Ort]",
        country: "Deutschland",
    },
    
    // Contact details
    contact: {
        email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || "support@example.com",
    },
    
    // Registration details (optional)
    registration: {
        court: process.env.NEXT_PUBLIC_LEGAL_REG_COURT || "",
        number: process.env.NEXT_PUBLIC_LEGAL_REG_NUMBER || "", 
        taxId: process.env.NEXT_PUBLIC_LEGAL_TAX_ID || "", 
    },
    
    // External links
    links: {
        disputeResolution: "https://ec.europa.eu/consumers/odr/",
    }
};
