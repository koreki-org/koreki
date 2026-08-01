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
   * Verifiziert, dass jede Datei in src/pages/api/ (außer logto-interna) den unified withSecurity Wrapper nutzt.
   */
  it('verifies that all sensitive API routes are protected with the unified withSecurity wrapper', () => {
    const apiFiles = getFilesRecursively(apiDir).filter(f => 
      f.endsWith('.ts') && 
      !f.includes('logto') && 
      !f.includes('_middleware') &&
      !f.includes('auth') // Public auth helpers are excluded
    );

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

});
