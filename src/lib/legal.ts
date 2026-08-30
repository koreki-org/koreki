import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger';
import { setzeEin } from './prompt-placeholder';
import { LEGAL_CONFIG } from '../config/legal-contact';

export interface LegalDocument {
    version: string;
    filename: string;
    content: string;
    hash: string;
}

/**
 * Discovers a legal document in src/legal/
 * If version is provided, it attempts to find that specific version.
 * If version is null/undefined, it returns the latest version.
 * Pattern: [type]_v[version].md
 */
/**
 * Setzt die Anbieterangaben in einen Rechtstext ein.
 *
 * Die Vertragstexte unter src/legal/ tragen Platzhalter, weil dieselbe Fassung
 * in jeder Installation gilt — im gehosteten Betrieb ebenso wie bei einem
 * White-Label-Betreiber, der nach Art. 25 Abs. 1 lit. a selbst Anbieter wird.
 * Wer die Datei von Hand ausfuellte, verloere die Aenderung beim naechsten
 * Update; deshalb kommen die Angaben aus der Konfiguration.
 *
 * Eingesetzt wird ueber `setzeEin`, nicht ueber `String.replace`: In dessen
 * Ersatztext haben $&, $` , $' und $$ Sonderbedeutung, und eine Firmierung
 * kann solche Zeichen enthalten.
 */
function setzeAnbieterEin(text: string): string {
    let ergebnis = text;
    for (const platzhalter of ['[FIRMIERUNG BITTE HIER EINTRAGEN]', 'Max Mustermann UG (haftungsbeschränkt)']) {
        ergebnis = setzeEin(ergebnis, platzhalter, LEGAL_CONFIG.controller.name);
    }
    ergebnis = setzeEin(ergebnis, '[ADRESSE BITTE HIER EINTRAGEN]', LEGAL_CONFIG.controller.address);
    return setzeEin(ergebnis, '[KONTAKT BITTE HIER EINTRAGEN]', LEGAL_CONFIG.contact.email);
}

export function getLegalDocument(type: 'avv' | 'tom' | 'betriebsanleitung'| 'agb', version?: string | null): LegalDocument | null {
    const legalDir = path.join(process.cwd(), 'src/legal');
    
    try {
        if (!fs.existsSync(legalDir)) return null;
        
        const files = fs.readdirSync(legalDir);
        
        // 1. Get all files for this type
        const filtered = files
            .filter(f => f.startsWith(`${type}_v`) && f.endsWith('.md'))
            .map(f => {
                const versionMatch = f.match(/_v([\d.]+)\.md/);
                return {
                    filename: f,
                    version: versionMatch ? versionMatch[1] : '0.0',
                };
            });

        if (filtered.length === 0) return null;

        let target: { filename: string; version: string } | undefined;

        if (version) {
            // Find specific version
            target = filtered.find(f => f.version === version);
        }

        if (!target) {
            // If No version or version not found, get latest
            filtered.sort((a, b) => {
                const partsA = a.version.split('.').map(Number);
                const partsB = b.version.split('.').map(Number);
                for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                    const valA = partsA[i] || 0;
                    const valB = partsB[i] || 0;
                    if (valA !== valB) return valB - valA;
                }
                return 0;
            });
            target = filtered[0];
        }

        const vorlage = fs.readFileSync(path.join(legalDir, target.filename), 'utf8');

        // Der Hash geht ueber die VORLAGE, nicht ueber den ausgefuellten Text.
        // Er soll die Fassung des Rechtstextes ausweisen, und die ist ueberall
        // dieselbe — die Firmierung ist eine Eigenschaft der Installation, keine
        // Aenderung der Vertragsbedingungen. Wuerde nach dem Einsetzen gehasht,
        // truege dieselbe AVV-Fassung in jeder White-Label-Instanz eine andere
        // Kennung, und die gespeicherten Einwilligungen waeren nicht vergleichbar.
        const hash = crypto.createHash('sha256').update(vorlage).digest('hex').toUpperCase();

        return {
            version: target.version,
            filename: target.filename,
            content: setzeAnbieterEin(vorlage),
            hash
        };
    } catch (error) {
        logger.error(`Error discovering ${type}${version ? ` (v${version})` : ''}`, error);
        return null;
    }
}

// Keeping getLatestLegalDocument for compatibility
export function getLatestLegalDocument(type: 'avv' | 'tom' | 'betriebsanleitung'| 'agb'): LegalDocument | null {
    return getLegalDocument(type);
}
