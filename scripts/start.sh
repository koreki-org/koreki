#!/bin/sh

echo "🏮 Koreki: Starting up..."

# Migrationen — nur, wo es eine Koreki-Datenbank gibt, und dort STRENG.
#
# BIS ZUM 29.10.2026 stand hier `migrate deploy || echo "starting anyway"`.
# Eine gescheiterte Migration liess den Server trotzdem starten, und der
# Health-Check (`SELECT 1`) meldete die Instanz als gesund — die Verbindung
# steht ja. Coolify rollte deshalb nie zurueck; auffallen haette es erst,
# wenn eine Lehrkraft auf eine fehlende Spalte trifft.
#
# WARUM NICHT EINFACH "DATABASE_URL GESETZT -> MIGRIEREN"
# Die Community-Multi-Compose-Dateien setzen bewusst einen PLATZHALTER
# (`postgresql://dummy:dummy@localhost:5432/dummy`), damit der Prisma-Client
# ueberhaupt gebaut werden kann. Dort gibt es keine Koreki-Datenbank —
# Community ist dateibasiert. Ein strenger Abbruch allein haette jede
# Community-Multi-Installation in eine Neustartschleife geschickt.
#
# Deshalb dieselbe Regel wie `isLocalInstance()` in src/lib/env-context.ts:
# Logto heisst SaaS (mit Datenbank); Keycloak, keine Anmeldung oder Modus
# community/desktop heissen lokal (ohne). Ist nichts davon gesetzt, wird
# migriert — ein unbekannter Zustand soll eher anhalten als still
# weiterlaufen. Der Waechter tests/unit/start-migration-governance.test.ts
# prueft, dass jede Compose-Datei mit Platzhalter auch als lokal erkennbar ist.

ist_lokal() {
    case "$NEXT_PUBLIC_AUTH_TYPE" in
        LOGTO) return 1 ;;
        KEYCLOAK|NONE) return 0 ;;
    esac
    case "$NEXT_PUBLIC_KOREKI_MODE" in
        community|desktop) return 0 ;;
    esac
    return 1
}

if [ -z "$DATABASE_URL" ]; then
    echo "ℹ️  Keine DATABASE_URL — keine Migrationen."
elif ist_lokal; then
    echo "ℹ️  Lokale Instanz (${NEXT_PUBLIC_AUTH_TYPE:-?}/${NEXT_PUBLIC_KOREKI_MODE:-?}) — keine Koreki-Datenbank, keine Migrationen."
else
    echo "🚀 Running database migrations..."
    # Prisma 7 findet prisma.config.ts im aktuellen Verzeichnis selbst.
    if ! node /app/node_modules/prisma/build/index.js migrate deploy; then
        # Kein Start ohne vollstaendiges Schema. Der Container beendet sich,
        # der Health-Check schlaegt fehl, Coolify bleibt auf der alten
        # Version. Ist nur die Datenbank kurz weg (z. B. nach einem
        # Server-Neustart), startet die Restart-Policy den Container neu,
        # bis sie wieder da ist.
        echo "❌ Migration fehlgeschlagen — Start abgebrochen."
        exit 1
    fi
fi

echo "✨ Starting Server..."
exec node /app/server.js
