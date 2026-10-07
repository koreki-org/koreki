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

            // --- braces, eingetragen am 07.10.2026 ---------------------------
            // EINE Meldung (GHSA-grv7-fg5c-xmjg, HIGH): braces kann bei stark
            // verschachtelten Mustern den Stack erschoepfen. Sie stand fuer die
            // 36 unmitigierten Treffer, die dieses Tor zuletzt rot gehalten
            // haben — alle 36 sind nur der Weiterleitungspfad dorthin:
            // tailwindcss -> chokidar / micromatch -> braces.
            //
            // Warum vertretbar: Tailwind ist ein BAUWERKZEUG. braces loest dort
            // Glob-Muster aus `tailwind.config.js` auf, um Klassennamen zu
            // finden — das laeuft beim Build, nie zur Laufzeit, und die Muster
            // schreiben wir selbst. `npm audit --omit=dev` meldet braces nicht.
            // Kein Schuelertext, kein Anfragepfad, kein Nutzereinfluss.
            //
            // Warum kein Fix moeglich: npm meldet `range: *` — es gibt KEINE
            // fehlerfreie braces-Version. Der vorgeschlagene "Fix" ist
            // tailwindcss@4, ein Hauptversionssprung, der das Design System
            // umwirft (Tokens, @apply, die ganze Konfigurationsform).
            //
            // WARUM DIESER EINTRAG UEBERHAUPT: Ein Tor, das dauerhaft rot
            // meldet, wird mit --no-verify umgangen — und dann prueft beim Push
            // gar nichts mehr, auch nicht Tests und Typen. Das ist die
            // Spiegelung des Fehlers vom 19.08.2026, als der Hook ohne `set -e`
            // immer gruen meldete: Beide Zustaende schalten den Waechter ab.
            //
            // ABBAUBEDINGUNG — ZWEI, es genuegt eine:
            //   1. `npm view braces versions` zeigt eine Version, die npm audit
            //      nicht mehr beanstandet. Dann aktualisieren, Eintrag weg.
            //   2. Koreki wechselt auf tailwindcss@4. Dann pruefen mit
            //      `npm ls braces`; bringt Tailwind es nicht mehr mit, MUSS
            //      dieser Eintrag sofort weg — nicht geprueft, sondern entfernt.
            'braces',

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
            'prisma',

            // --- mysql2, eingetragen am 03.09.2026 ---------------------------
            // Zwei Meldungen: ein Auth-Downgrade auf mysql_clear_password, der
            // Zugangsdaten im Klartext an einen boesartigen MySQL-Server
            // schickt (HIGH), und eine Dekompressionsbombe im komprimierten
            // MySQL-Protokoll (MODERATE). Kommt als Beipack von prisma@7.10.0.
            //
            // Warum vertretbar: Koreki spricht kein MySQL. Der Datenbank-
            // Provider in prisma/schema.prisma ist `postgresql`, und im
            // gesamten `src/` kommt MySQL nicht vor. Beide Schwachstellen
            // sitzen im MySQL-Wire-Protokoll und setzen voraus, dass die
            // Anwendung eine Verbindung zu einem MySQL-Server aufbaut. Der
            // Treiber liegt in node_modules und wird nie geladen.
            //
            // Das ist eine ANDERE Begruendung als bei der deepmerge-ts-Kette
            // darueber. Dort lautet sie "kein Anfragepfad" — der Code laeuft,
            // ist aber schwer erreichbar. Hier ist der Code UNERREICHBAR,
            // solange der Provider PostgreSQL ist. Am 17.08.2026 war die
            // Entscheidung ausdruecklich "warten, statt die Ausnahmeliste zu
            // erweitern"; sie wird hier bewusst anders getroffen, weil die
            // Begruendung strenger ist.
            //
            // ABBAUBEDINGUNG — ZWEI, es genuegt eine:
            //   1. `npm ls mysql2` meldet das Paket nicht mehr, weil Prisma es
            //      nicht mehr mitbringt.
            //   2. Der Provider in prisma/schema.prisma ist NICHT mehr
            //      `postgresql`. Dann traegt die Begruendung nicht mehr und der
            //      Eintrag MUSS sofort weg — nicht geprueft, sondern entfernt.
            'mysql2'
        ];

        // Die Ausnahmeliste nennt URSACHEN, npm meldet WEITERLEITUNGEN.
        // 🧭
        //
        // GEFUNDEN AM 07.10.2026: Die Liste oben wurde gegen `pkgName` geprueft
        // — also gegen den Schluessel in `vulnerabilities`. Den fuellt npm aber
        // mit JEDEM Paket der Kette. Eine einzige Meldung in `braces` erschien
        // deshalb als 36 Treffer: `jest`, `jest-cli`, `babel-jest`, `chokidar`,
        // `tailwindcss` und so weiter — alles nur Pakete, die darauf zeigen.
        //
        // Ein Eintrag 'braces' in der Liste konnte davon nichts stillegen. Um
        // das Tor gruen zu bekommen, haette man alle 36 Namen eintragen muessen
        // — und damit auch jede KUENFTIGE, echte Meldung in `jest` oder
        // `tailwindcss` selbst mit stillgelegt. Genau das waere die pauschale
        // Ausnahme, die dieses Projekt nicht will.
        //
        // Also wird jetzt die Ursache verglichen. In `via` stehen entweder
        // Advisory-Objekte (das Paket ist SELBST betroffen, `name` nennt es)
        // oder Strings (Weiterleitung — der String nennt das naechste Paket der
        // Kette). Wir folgen den Strings bis zu den Objekten und sammeln die
        // tatsaechlichen Quellen.
        const wurzelUrsachen = (startPaket) => {
            const quellen = new Map(); // Name -> hoechste Advisory-Schwere
            const gesehen = new Set();
            const offen = [startPaket];
            const rang = { low: 1, moderate: 2, high: 3, critical: 4 };
            while (offen.length > 0) {
                const name = offen.pop();
                if (gesehen.has(name)) continue; // Zyklen in der Kette abfangen
                gesehen.add(name);
                for (const v of (vulns[name]?.via) || []) {
                    if (typeof v === 'string') offen.push(v);
                    else if (v?.name) {
                        const bisher = quellen.get(v.name);
                        const neu = v.severity || 'low';
                        if (!bisher || rang[neu] > rang[bisher]) quellen.set(v.name, neu);
                    }
                }
            }
            return quellen;
        };

        let hasBlocker = false;

        for (const [pkgName, vuln] of Object.entries(vulns)) {
            if (vuln.severity === 'high' || vuln.severity === 'critical') {
                const quellen = wurzelUrsachen(pkgName);
                const offen = [...quellen].filter(([name]) => !allowedPackages.includes(name));

                // Die Schwere am PAKET ist das Maximum ueber alle Pfade. Steht
                // sie auf "high", weil ein begruendeter Pfad high ist, waehrend
                // der verbleibende unbegruendete nur moderate ist, dann ist der
                // Treffer nach der eigenen Regel dieses Tores (high/critical)
                // keiner. Deshalb entscheidet die Schwere der UNBEGRUENDETEN
                // Ursache, nicht die des Pakets.
                //
                // Das schwaecht nichts ab: Eine high- oder critical-Ursache
                // ohne Begruendung blockiert weiterhin, egal wo in der Kette
                // sie sitzt. Es verhindert nur, dass ein moderate-Fund als high
                // auftritt, weil er sich eine Kette mit einem high teilt.
                const blocker = offen.filter(([, schwere]) => schwere === 'high' || schwere === 'critical');

                if (blocker.length > 0) {
                    const woher = blocker.map(([n, s]) => `${n} (${s})`).join(', ');
                    console.error(`🚨 Unmitigated vulnerability found in '${pkgName}' — Ursache: ${woher}`);
                    hasBlocker = true;
                } else if (quellen.size === 0) {
                    // Keine Ursache ermittelbar — lieber blockieren als raten.
                    console.error(`🚨 Unmitigated vulnerability found in '${pkgName}' (${vuln.severity}) — Ursache nicht ermittelbar`);
                    hasBlocker = true;
                } else {
                    const ursachen = [...quellen].map(([n, s]) => `${n} (${s})`).join(', ');
                    console.log(`⚠️  Ignoring mitigated vulnerability in '${pkgName}' — Ursache: ${ursachen}`);
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
