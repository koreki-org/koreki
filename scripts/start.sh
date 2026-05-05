#!/bin/sh

echo "🏮 Koreki: Starting up..."

if [ -n "$DATABASE_URL" ]; then
    echo "🚀 Running database migrations..."
    # Prisma 7 will find prisma.config.ts automatically in the current directory
    node /app/node_modules/prisma/build/index.js migrate deploy || echo "⚠️ Migration failed, starting anyway"
fi

echo "✨ Starting Server..."
exec node /app/server.js
