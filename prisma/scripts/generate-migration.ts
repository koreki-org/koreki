import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Koreki Industrial Grade Migration Generator
 * This script allows generating official Prisma migrations WITHOUT a live database.
 * It uses a local shadow-schema approach to create traceable SQL files.
 */

const MIGRATION_NAME = process.argv[2] || 'auto_migration';
const TIMESTAMP = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
const FOLDER_NAME = `${TIMESTAMP}_${MIGRATION_NAME}`;
const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');
const TARGET_DIR = path.join(MIGRATIONS_DIR, FOLDER_NAME);

async function generate() {
    console.log(`🚀 Generating migration: ${FOLDER_NAME}...`);

    try {
        if (!fs.existsSync(MIGRATIONS_DIR)) fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
        if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

        // Step 1: Use prisma migrate diff to generate SQL
        // We compare the migrations folder (current state) with the schema.prisma (target state)
        console.log("🔍 Comparing schema with existing migrations...");
        
        // Note: We use --script to get the raw SQL output
        const sql = execSync(
            `npx prisma@7 migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`,
            { encoding: 'utf-8', env: { ...process.env, DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/postgres" } }
        );

        if (sql.trim().length < 10) {
            console.log("✅ No changes detected. Database is already in sync with schema.");
            fs.rmdirSync(TARGET_DIR);
            return;
        }

        // Step 2: Write the SQL to the new migration file
        fs.writeFileSync(path.join(TARGET_DIR, 'migration.sql'), sql);
        
        console.log(`✨ Success! Migration folder created: prisma/migrations/${FOLDER_NAME}`);
        console.log(`👉 Next step: git add prisma/migrations && git push`);
        console.log(`🚀 Deployment will automatically pick up and apply the migration via 'migrate deploy'.`);

    } catch (error: any) {
        console.error("❌ Error generating migration:", error.stderr || error.message);
        process.exit(1);
    }
}

generate();
