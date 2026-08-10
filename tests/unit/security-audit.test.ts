import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join } from 'path';

/**
 * Industrial Grade Security Audit (Layer 1)
 * 🛡️鹰眼 - Das Security-Auge von Koreki
 * 
 * Dieser Test beweist, dass keine API-Schnittstelle ohne Auth-Wrapper existiert
 * und keine Entwickler-Backdoors im Projekt vorhanden sind.
 */

describe('Security Governance Audit', () => {

  const apiDir = join(process.cwd(), 'src/pages/api');
  const srcDir = join(process.cwd(), 'src');

  // Hilfsfunktion zur rekursiven Dateisuche
  const getFilesRecursively = (dir: string): string[] => {
    let results: string[] = [];
    const list = readdirSync(dir);
    list.forEach((file) => {
      const filePath = join(dir, file);
      const stat = lstatSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(filePath));
      } else {
        results.push(filePath);
      }
    });
    return results;
  };

  /**
   * TEST: API WRAPPER AUDIT
   * Verifiziert, dass JEDE Datei in src/pages/api/ den unified withSecurity
   * Wrapper nutzt.
   *
   * Frueher waren 'logto' und 'auth' pauschal ueber den Pfad ausgenommen. Genau
   * diese Ausnahme hat den Auth-Flow der Pruefung dauerhaft entzogen — eine
   * Route verschwand allein dadurch aus dem Audit, dass sie im richtigen
   * Verzeichnis lag. Ausnahmen laufen jetzt ausschliesslich ueber den
   * expliziten `// @security-audit-exclude`-Tag IN der Datei: er zwingt zu einer
   * Begruendung an Ort und Stelle und ist im Diff sichtbar.
   */
  it('verifies that all sensitive API routes are protected with the unified withSecurity wrapper', () => {
    const apiFiles = getFilesRecursively(apiDir).filter(f => f.endsWith('.ts'));

    apiFiles.forEach(filePath => {
      const content = readFileSync(filePath, 'utf8');
      const fileName = filePath.split(/[\\/]/).pop();

      // Jede produktive API-Route MUSS:
      // 1. Den Unified Security-Wrapper nutzen (Standard für alle Aktionen)
      // 2. ODER: Eine Stripe-Webhook-Validierung enthalten
      // 3. ODER: Explizit als PUBLIC_ENDPOINT markiert sein
      const hasWrapper = content.includes('withSecurity(');
      const isStripeWebhook = content.includes('stripe.webhooks.constructEvent');
      const isPublicEndpoint = content.includes('// @security-audit-exclude');

      if (!hasWrapper && !isStripeWebhook && !isPublicEndpoint) {
        throw new Error(`SECURITY BREACH: API Route '${fileName}' has no visible withSecurity wrapper, Stripe Validation, or Exclusion-Tag!`);
      }
    });
  });

  /**
   * TEST: ADMIN-ROUTE AUDIT
   *
   * Der Wrapper-Test oben prüft nur, DASS `withSecurity(` vorkommt — nicht, mit
   * welchen Optionen. Genau dadurch blieb `admin/users.ts` unentdeckt: die Route
   * war umschlossen, aber ohne `requireAdmin`, sodass jede angemeldete Lehrkraft
   * Rollen setzen, Credits vergeben und Konten löschen konnte.
   *
   * Routen unter api/admin/** müssen die Rolle daher nachweislich prüfen —
   * entweder über die Wrapper-Option oder mit einem eigenen Check im Handler.
   */
  it('verifies that every admin route enforces a role check', () => {
    const adminFiles = getFilesRecursively(join(apiDir, 'admin')).filter(f => f.endsWith('.ts'));

    expect(adminFiles.length).toBeGreaterThan(0);

    adminFiles.forEach(filePath => {
      const content = readFileSync(filePath, 'utf8');
      const fileName = filePath.split(/[\\/]/).pop();

      const hasWrapperOption = /requireAdmin\s*:/.test(content);
      // Eigenständige Prüfung im Handler (z. B. admin/settings.ts, global-ai-settings.ts)
      const hasHandlerCheck = /role\s*!==\s*'ADMIN'|roles\.includes\('ADMIN'\)/.test(content);

      if (!hasWrapperOption && !hasHandlerCheck) {
        throw new Error(
          `SECURITY BREACH: Admin-Route '${fileName}' erzwingt keine Rollenprüfung ` +
          `(weder requireAdmin-Option noch Handler-Check)!`
        );
      }
    });
  });

  /**
   * TEST: AI-ROUTE AUDIT
   *
   * Zwei Pflichten für jede Route, die einen KI-Anbieter aufruft:
   *
   * 1. `isAi: true` — sonst greift der globale Limiter (100/min) statt des
   *    AI-Limiters (10/min) und die teuersten Endpunkte sind am schwächsten
   *    geschützt (Säule 1).
   * 2. `sanitizeClientAiSettings` — client-gelieferte Verbindungsdaten dürfen im
   *    SaaS nicht an den Provider durchgereicht werden, sonst lässt sich der
   *    Server-Schlüssel an eine fremde Adresse ausleiten.
   */
  it('verifies that every AI provider route is rate-limited and strips client connection settings', () => {
    const apiFiles = getFilesRecursively(apiDir).filter(f => f.endsWith('.ts'));
    const providerCall = /execute(OpenAI|Mistral|Ollama)Request/;

    const aiRoutes = apiFiles.filter(f => providerCall.test(readFileSync(f, 'utf8')));

    expect(aiRoutes.length).toBeGreaterThan(0);

    aiRoutes.forEach(filePath => {
      const content = readFileSync(filePath, 'utf8');
      const fileName = filePath.split(/[\\/]/).pop();

      if (!/isAi\s*:\s*true/.test(content)) {
        throw new Error(
          `SECURITY BREACH: KI-Route '${fileName}' läuft ohne 'isAi: true' im ` +
          `globalen Rate-Limit statt im AI-Limit!`
        );
      }

      // Nur relevant, wenn die Route überhaupt Settings aus dem Request annimmt.
      if (/settings/.test(content) && !content.includes('sanitizeClientAiSettings')) {
        throw new Error(
          `SECURITY BREACH: KI-Route '${fileName}' reicht client-gelieferte ` +
          `settings ungefiltert an den Provider weiter (sanitizeClientAiSettings fehlt)!`
        );
      }
    });
  });

  /**
   * TEST: NO-BYPASS AUDIT
   * Verifiziert, dass keine gefährlichen Fragmente für Login-Bypasses im Code existieren.
   */
  it('ensures no development or test bypasses exist in security-critical logic', () => {
    const srcFiles = getFilesRecursively(srcDir).filter(f => 
      (f.endsWith('.ts') || f.endsWith('.tsx')) &&
      !f.includes('.test.') &&
      !f.includes('env-context.ts') // This is the ONLY authorized place for the desktop flag
    );

    const forbiddenPatterns = [
      /if\s*\(process\.env\.NODE_ENV\s*===\s*['"]test['"]\)\s*{\s*return\s*true/,
      /bypass_auth:\s*true/,
      /skipAuth\s*=\s*true/,
      /NEXT_PUBLIC_KOREKI_DESKTOP/, // Should only be used in env-context.ts
      /master_key/i,
      /admin_override/i,
      // Client-gelieferte Identitäts-Header sind KEINE Vertrauensquelle.
      // Identität stammt ausschließlich aus dem verifizierten Bearer-Token
      // (src/lib/auth-keycloak-server.ts). Historischer Bypass — nie wieder einführen.
      /x-koreki-user-(id|roles)/i
    ];

    srcFiles.forEach(filePath => {
      const content = readFileSync(filePath, 'utf8');
      const fileName = filePath.split(/[\\/]/).pop();

      forbiddenPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          throw new Error(`SECURITY ALERT: Forbidden pattern '${pattern}' found in '${fileName}'! Potential Bypass detected.`);
        }
      });
    });
  });

  /**
   * TEST: ENV-EXAMPLE AUDIT
   * .env.example wird mit dem Repository veröffentlicht. Sie enthielt bereits
   * einmal einen echten OpenAI-Schlüssel, der dadurch in die öffentliche
   * Git-Historie geriet — dort ist er auch nach dem Entfernen noch abrufbar.
   * Geprüft wird auf bekannte Schlüsselformate statt auf eine Platzhalter-
   * Whitelist, damit beschreibende Platzhalter nicht fälschlich anschlagen.
   */
  it('ensures .env.example never contains a real-looking secret', () => {
    const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8');

    const realSecretShapes = [
      { name: 'OpenAI / kompatibel', pattern: /^sk-[A-Za-z0-9_-]{15,}/ },
      { name: 'Stripe Secret', pattern: /^sk_(live|test)_[A-Za-z0-9]{15,}/ },
      { name: 'Stripe Webhook', pattern: /^whsec_[A-Za-z0-9]{15,}/ },
      { name: 'SendGrid', pattern: /^SG\.[A-Za-z0-9_.-]{15,}/ },
      { name: 'Base64-Token', pattern: /^[A-Za-z0-9+/]{40,}={0,2}$/ }
    ];

    const offenders: string[] = [];

    envExample.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) return;

      const [, variable, rawValue] = match;
      // Inline-Kommentare abschneiden, Anführungszeichen entfernen
      const value = rawValue.split('#')[0].trim().replace(/^["']|["']$/g, '');
      if (!value) return;

      const hit = realSecretShapes.find(shape => shape.pattern.test(value));
      if (hit) offenders.push(`${variable} (${hit.name})`);
    });

    if (offenders.length > 0) {
      throw new Error(
        `SECURITY BREACH: .env.example enthält echt aussehende Secrets: ${offenders.join(', ')}. ` +
        `Durch Platzhalter ersetzen — und den betroffenen Schlüssel beim Anbieter widerrufen, ` +
        `da er über die Git-Historie öffentlich bleibt.`
      );
    }
  });

});
