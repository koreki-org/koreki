const { execSync } = require('child_process');

console.log('Running npm audit --json...');
try {
    execSync('npm audit --audit-level=high --json', { stdio: 'pipe' });
    console.log('✅ Audit passed. No high/critical vulnerabilities found.');
    process.exit(0);
} catch (error) {
    if (error.stdout) {
        const output = JSON.parse(error.stdout.toString());
        const vulns = output.vulnerabilities || {};
        
        // Allowed vulnerabilities that we have mitigated locally or are dev-tooling only
        const allowedPackages = [
            'expr-eval',        // Mitigated via regex guard in plugins.ts
            'brace-expansion',  // Dev tooling only (ESLint/TS parser, no runtime impact)
            'js-yaml',          // Dev tooling only (ESLint config parser, no runtime impact)

            // --- Prisma-Kette, eingetragen am 17.08.2026 ---------------------
            // Ursache ist EINE Meldung: deepmerge-ts <8 kann bei rekursiven
            // Objektgraphen den Stack erschoepfen (GHSA-ggr8-5vv4-36mx). Die
            // beiden anderen Eintraege sind nur der Abhaengigkeitspfad dorthin:
            // prisma -> @prisma/config -> deepmerge-ts.
            //
            // Warum vertretbar: Der Fehler sitzt in Prismas KONFIGURATIONS-Lader,
            // nicht auf einem Anfragepfad. Ein rekursiver Objektgraph muesste aus
            // der Prisma-Konfigurationsdatei kommen — die schreiben wir selbst,
            // kein Nutzer kann sie beeinflussen. Schuelerdaten beruehrt der
            // Lader nie.
            //
            // Warum kein Fix moeglich: @prisma/config pinnt deepmerge-ts EXAKT
            // auf 7.1.5. Ein npm-override auf 8.x zwaenge Prisma einen
            // ungetesteten Major auf; der von npm vorgeschlagene "Fix" waere ein
            // Downgrade auf Prisma 6 und damit das Verwerfen der 7er-Migration.
            //
            // ABBAUBEDINGUNG: Sobald Prisma > 7.9.1 erscheint, pruefen mit
            //   npm view @prisma/config@<version> dependencies.deepmerge-ts
            // Steht dort 8.x, aktualisieren und DIESE DREI ZEILEN ENTFERNEN.
            'deepmerge-ts',
            '@prisma/config',
            'prisma'
        ];

        let hasBlocker = false;

        for (const [pkgName, vuln] of Object.entries(vulns)) {
            if (vuln.severity === 'high' || vuln.severity === 'critical') {
                if (allowedPackages.includes(pkgName)) {
                    console.log(`⚠️  Ignoring mitigated vulnerability in '${pkgName}' (${vuln.severity})`);
                } else {
                    console.error(`🚨 Unmitigated vulnerability found in '${pkgName}' (${vuln.severity})`);
                    hasBlocker = true;
                }
            }
        }

        if (hasBlocker) {
            console.error('\n❌ Security Audit failed due to unmitigated high/critical vulnerabilities.');
            process.exit(1);
        } else {
            console.log('\n✅ Security Audit passed (known vulnerabilities are mitigated).');
            process.exit(0);
        }
    } else {
        console.error('Audit failed to execute properly:', error);
        process.exit(1);
    }
}
