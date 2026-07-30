#!/usr/bin/env node

/**
 * 🏮 Koreki Universal Setup Wizard & CLI
 * Single-command setup for Koreki Community, SaaS, and Desktop editions.
 */

import readline from 'node:readline';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_URL = 'https://github.com/koreki-org/koreki.git';

// Target directory is current working directory (where user runs command)
let TARGET_DIR = process.cwd();

// Guard: If running in system folder like C:\Windows\System32, switch to user's home folder
if (os.platform() === 'win32' && /\\system32/i.test(TARGET_DIR)) {
  const userHome = os.homedir() || 'C:\\Users\\Public';
  TARGET_DIR = path.join(userHome, 'koreki-app');
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }
  process.chdir(TARGET_DIR);
}

// Helper: Ensure repo files exist in target directory
function ensureRepoFilesExist() {
  const hasCompose = fs.existsSync(path.join(TARGET_DIR, 'docker-compose.community-multi-full.yml')) ||
                     fs.existsSync(path.join(TARGET_DIR, 'docker-compose.yml'));
                     
  if (hasCompose) {
    // Repo exists — pull latest changes to ensure fixes are applied
    if (fs.existsSync(path.join(TARGET_DIR, '.git'))) {
      console.log(c('cyan', '🔄 Updating existing Koreki installation to latest version...'));
      try {
        execSync('git fetch origin main', { cwd: TARGET_DIR, stdio: 'inherit' });
        execSync('git reset --hard origin/main', { cwd: TARGET_DIR, stdio: 'inherit' });
        console.log(c('green', '✔ Updated to latest version.\n'));
      } catch {
        console.log(c('dim', 'ℹ Could not auto-update (offline or uncommitted changes). Continuing with existing files.\n'));
      }
    }
    return;
  }

  const korekiFolder = path.join(TARGET_DIR, 'koreki');
  if (fs.existsSync(path.join(korekiFolder, 'docker-compose.community-multi-full.yml')) ||
      fs.existsSync(path.join(korekiFolder, 'docker-compose.yml'))) {
    TARGET_DIR = korekiFolder;
    process.chdir(TARGET_DIR);
    // Pull latest in sub-folder repo too
    if (fs.existsSync(path.join(TARGET_DIR, '.git'))) {
      console.log(c('cyan', '🔄 Updating existing Koreki installation to latest version...'));
      try {
        execSync('git fetch origin main', { cwd: TARGET_DIR, stdio: 'inherit' });
        execSync('git reset --hard origin/main', { cwd: TARGET_DIR, stdio: 'inherit' });
      } catch {
        console.log(c('dim', 'ℹ Could not auto-update. Continuing with existing files.\n'));
      }
    }
    return;
  }

  console.log(c('yellow', '📦 Koreki repository files not found in current folder.'));
  console.log(c('bold', '⬇️  Downloading Koreki environment automatically...'));

  if (isCommandAvailable('git')) {
    let success = false;
    try {
      execSync(`git clone --depth 1 ${REPO_URL} koreki`, { cwd: TARGET_DIR, stdio: 'inherit' });
      success = true;
    } catch {
      try {
        console.log(c('dim', 'HTTPS clone failed, trying SSH clone...'));
        execSync(`git clone --depth 1 git@github.com:koreki-org/koreki.git koreki`, { cwd: TARGET_DIR, stdio: 'inherit' });
        success = true;
      } catch {}
    }

    if (success) {
      TARGET_DIR = korekiFolder;
      process.chdir(TARGET_DIR);
      console.log(c('green', '✔ Repository cloned into ./koreki\n'));
      return;
    }
  }

  console.log(c('red', '✖ Could not clone repository via Git. Please clone manually or check your GitHub access permissions:'));
  console.log(c('bold', '  git clone git@github.com:koreki-org/koreki.git'));
  process.exit(1);
}

// ANSI Color Helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Helper: Ask question with readline
function askQuestion(query, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptText = defaultValue
    ? `${query} ${c('dim', `(Default: ${defaultValue})`)}: `
    : `${query}: `;

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Helper: Generate Random Password
function generateSecret(length = 24) {
  return crypto.randomBytes(length).toString('hex');
}

// Helper: Check CLI Command
function isCommandAvailable(command) {
  try {
    const isWin = os.platform() === 'win32';
    const nullOutput = isWin ? 'NUL' : '/dev/null';
    execSync(`${command} --version > ${nullOutput} 2>&1`);
    return true;
  } catch {
    return false;
  }
}

// Helper: Banner
function printBanner() {
  console.clear();
  console.log(c('cyan', '---------------------------------------------------------'));
  console.log(c('bold', c('magenta', '  🏮 KOREKI UNIVERSAL SETUP WIZARD')));
  console.log(c('dim', '     Industrial AI-Assisted Grading & Education Platform'));
  console.log(c('cyan', '---------------------------------------------------------\n'));
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log(`
Usage: npx koreki-cli [options]

Options:
  --dry-run   Simulate setup without modifying files or running Docker
  --help, -h  Show this help message
`);
    process.exit(0);
  }

  printBanner();

  // 1. System Check
  console.log(c('bold', '🔍 1. System & Environment Diagnostic'));
  
  const platform = os.platform();
  const osName = platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux';
  console.log(`   • Operating System: ${c('green', osName)}`);

  const hasDocker = isCommandAvailable('docker');
  const hasDockerCompose = isCommandAvailable('docker compose') || isCommandAvailable('docker-compose');

  if (hasDocker) {
    console.log(`   • Docker Engine:    ${c('green', '✔ Installed')}`);
  } else {
    console.log(`   • Docker Engine:    ${c('yellow', '✖ Not Found (Required for Server Editions)')}`);
  }

  if (hasDockerCompose) {
    console.log(`   • Docker Compose:   ${c('green', '✔ Installed')}`);
  } else {
    console.log(`   • Docker Compose:   ${c('yellow', '✖ Not Found (Required for Server Editions)')}`);
  }

  console.log('\n' + c('cyan', '---------------------------------------------------------') + '\n');

  // 2. Select Edition
  console.log(c('bold', '🚀 2. Select Koreki Edition'));
  console.log(`
  ${c('bold', '1)')} ${c('cyan', 'Community Single-User')} (Stateless, Zero-Ops, 0 DB, Port 3000)
  ${c('bold', '2)')} ${c('magenta', 'Community Multi-User')}  (Keycloak IAM + Nginx Gateway + DB, Port 8080)
  ${c('bold', '3)')} ${c('blue', 'SaaS Full-Stack')}       (Postgres + Stripe + Auth Proxy, Port 3000)
  ${c('bold', '4)')} ${c('yellow', 'Desktop Application')}    (Download Native Windows / Mac / Linux App)
`);

  const choice = await askQuestion(c('bold', 'Select an option (1-4)'), '2');

  console.log('\n' + c('cyan', '---------------------------------------------------------') + '\n');

  switch (choice) {
    case '1':
      await setupCommunitySingle(isDryRun);
      break;
    case '2':
      await setupCommunityMulti(isDryRun);
      break;
    case '3':
      await setupSaaSFull(isDryRun);
      break;
    case '4':
      await setupDesktopApp(platform);
      break;
    default:
      console.log(c('red', 'Invalid choice. Exiting.'));
      process.exit(1);
  }
}

// Option 1: Community Single
async function setupCommunitySingle(isDryRun) {
  console.log(c('bold', '⚙️  Configuring Koreki Community (Single-User)...'));

  const mistralKey = await askQuestion('Mistral API Key (Optional, press Enter to skip)', '');
  
  const envContent = `
# Koreki Community Single-User Configuration
NEXT_PUBLIC_KOREKI_MODE=community
NEXT_PUBLIC_SINGLE_USER_MODE=true
MISTRAL_API_KEY=${mistralKey}
NEXT_PUBLIC_ENABLE_PAID_MODES=false
`;

  ensureRepoFilesExist();
  const envPath = path.join(TARGET_DIR, '.env');
  const composeFile = 'docker-compose.community.yml';

  if (isDryRun) {
    console.log(c('yellow', '\n[DRY-RUN] Would write .env and run:'));
    console.log(`docker compose -f ${composeFile} up -d --build`);
    return;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(c('green', '✔ Created .env file successfully.'));

  console.log(c('bold', '\n🚀 Launching Docker Containers...'));
  try {
    execSync(`docker compose -f ${composeFile} up -d --build`, { cwd: TARGET_DIR, stdio: 'inherit' });
    console.log(c('green', '\n✅ Koreki Community (Single-User) is running!'));
    console.log(c('bold', '👉 Open in browser: http://localhost:3000'));
  } catch (err) {
    console.error(c('red', '\n❌ Failed to start Docker container: ' + err.message));
  }
}

// Option 2: Community Multi-User (Keycloak)
async function setupCommunityMulti(isDryRun) {
  console.log(c('bold', '⚙️  Configuring Koreki Community Multi-User (Keycloak & Gateway)...'));

  let appUrl = await askQuestion('Public APP_URL (with protocol & port)', 'http://localhost:8080');
  if (!/^https?:\/\//i.test(appUrl)) {
    appUrl = `http://${appUrl}`;
  }
  appUrl = appUrl.replace(/\/+$/, '');
  
  const envMode = await askQuestion('Environment (dev or prod)', 'dev');
  const mistralKey = await askQuestion('Mistral API Key (Optional)', '');
  
  const adminPassword = generateSecret(12);
  const dbPassword = generateSecret(16);

  const envContent = `
# Koreki Community Multi-User Configuration
ENVIRONMENT=${envMode}
APP_URL=${appUrl}
PUBLIC_PORT=8080

NEXT_PUBLIC_KOREKI_MODE=community
NEXT_PUBLIC_SINGLE_USER_MODE=false
NEXT_PUBLIC_AUTH_TYPE=KEYCLOAK
NEXT_PUBLIC_OIDC_ISSUER=${appUrl}/auth/realms/koreki
NEXT_PUBLIC_OIDC_CLIENT_ID=koreki-app

KC_ADMIN_PASSWORD=${adminPassword}
KC_DB_PASSWORD=${dbPassword}
MISTRAL_API_KEY=${mistralKey}
NEXT_PUBLIC_ENABLE_PAID_MODES=false
`;

  ensureRepoFilesExist();

  // Inject dynamic appUrl into keycloak realm config
  try {
    const realmFile = path.join(TARGET_DIR, `keycloak/koreki-realm.${envMode}.json`);
    if (fs.existsSync(realmFile)) {
      const realmJson = JSON.parse(fs.readFileSync(realmFile, 'utf8'));
      if (realmJson.clients && Array.isArray(realmJson.clients)) {
        const appClient = realmJson.clients.find(c => c.clientId === 'koreki-app');
        if (appClient) {
          appClient.redirectUris = Array.from(new Set([
            `${appUrl}/*`,
            'http://localhost/*',
            'http://localhost:8080/*',
            'http://127.0.0.1/*',
            'http://127.0.0.1:8080/*'
          ]));
          fs.writeFileSync(realmFile, JSON.stringify(realmJson, null, 2));
        }
      }
    }
  } catch (e) {
    console.log(c('dim', 'Note: Could not update Keycloak realm file dynamically: ' + e.message));
  }

  ensureRepoFilesExist();
  const envPath = path.join(TARGET_DIR, '.env');
  const composeFile = 'docker-compose.community-multi-full.yml';

  console.log('\n' + c('bold', '🔑 Generated Credentials:'));
  console.log(`   • Keycloak Admin User:     ${c('green', 'admin')}`);
  console.log(`   • Keycloak Admin Password: ${c('yellow', adminPassword)}`);
  console.log(`   • Database Password:       ${c('dim', dbPassword)}`);

  if (isDryRun) {
    console.log(c('yellow', '\n[DRY-RUN] Would write .env and run:'));
    console.log(`docker compose -f ${composeFile} up -d --build`);
    return;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(c('green', '\n✔ Created .env file successfully.'));

  console.log(c('bold', '\n🚀 Launching Koreki Multi-User Stack (App + Keycloak + Nginx + Postgres)...'));
  try {
    execSync(`docker compose -f ${composeFile} build --no-cache`, { cwd: TARGET_DIR, stdio: 'inherit' });
    execSync(`docker compose -f ${composeFile} up -d`, { cwd: TARGET_DIR, stdio: 'inherit' });
    console.log(c('green', '\n✅ Koreki Community Multi-User Stack is running!'));
    console.log(`👉 App URL:            ${c('bold', appUrl)}`);
    console.log(`👉 Keycloak Admin UI:  ${c('bold', `${appUrl}/auth/admin`)}`);
    console.log(c('dim', 'Note: Keycloak may take 30-45 seconds to initialize on first launch.'));
  } catch (err) {
    console.log(c('yellow', '\n⚠️  Initial launch encountered a database volume issue. Resetting stale volumes and retrying...'));
    try {
      execSync(`docker compose -f ${composeFile} down -v`, { cwd: TARGET_DIR, stdio: 'inherit' });
      execSync(`docker compose -f ${composeFile} build --no-cache`, { cwd: TARGET_DIR, stdio: 'inherit' });
      execSync(`docker compose -f ${composeFile} up -d`, { cwd: TARGET_DIR, stdio: 'inherit' });
      console.log(c('green', '\n✅ Koreki Community Multi-User Stack is running!'));
      console.log(`👉 App URL:            ${c('bold', appUrl)}`);
      console.log(`👉 Keycloak Admin UI:  ${c('bold', `${appUrl}/auth/admin`)}`);
      console.log(c('dim', 'Note: Keycloak may take 30-45 seconds to initialize on first launch.'));
    } catch (retryErr) {
      console.error(c('red', '\n❌ Failed to start Docker stack: ' + retryErr.message));
    }
  }
}

// Option 3: SaaS Full-Stack
async function setupSaaSFull(isDryRun) {
  console.log(c('bold', '⚙️  Configuring Koreki SaaS Full-Stack...'));

  const dbUser = await askQuestion('Postgres User', 'postgres');
  const dbPassword = await askQuestion('Postgres Password', 'postgres');
  const dbName = await askQuestion('Postgres Database Name', 'koreki');
  const mistralKey = await askQuestion('Mistral API Key', '');

  const envContent = `
# Koreki SaaS Full-Stack Configuration
POSTGRES_USER=${dbUser}
POSTGRES_PASSWORD=${dbPassword}
POSTGRES_DB=${dbName}
DATABASE_URL=postgresql://${dbUser}:${dbPassword}@db:5432/${dbName}?schema=public

MISTRAL_API_KEY=${mistralKey}
STRIPE_TEST_MODE=true
`;

  ensureRepoFilesExist();
  const envPath = path.join(TARGET_DIR, '.env');
  const composeFile = 'docker-compose.yml';

  if (isDryRun) {
    console.log(c('yellow', '\n[DRY-RUN] Would write .env and run:'));
    console.log(`docker compose -f ${composeFile} up -d --build`);
    return;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(c('green', '✔ Created .env file successfully.'));

  console.log(c('bold', '\n🚀 Launching Koreki SaaS Stack...'));
  try {
    execSync(`docker compose -f ${composeFile} up -d --build`, { cwd: TARGET_DIR, stdio: 'inherit' });
    console.log(c('green', '\n✅ Koreki SaaS Stack is running!'));
    console.log(c('bold', '👉 Open in browser: http://localhost:3000'));
  } catch (err) {
    console.error(c('red', '\n❌ Failed to start Docker stack: ' + err.message));
  }
}

// Option 4: Desktop App
async function setupDesktopApp(platform) {
  console.log(c('bold', '💻 Koreki Desktop Application Installer'));

  const releasesUrl = 'https://github.com/koreki-org/koreki/releases/latest';

  if (platform === 'win32') {
    console.log(`\nTo install Koreki Desktop on Windows via WinGet:`);
    console.log(c('cyan', c('bold', '  winget install Koreki.Desktop')));
    console.log(`\nOr download the latest .msi installer directly from:`);
    console.log(c('bold', `  ${releasesUrl}`));
  } else if (platform === 'darwin') {
    console.log(`\nTo install Koreki Desktop on macOS via Homebrew:`);
    console.log(c('cyan', c('bold', '  brew install --cask koreki')));
    console.log(`\nOr download the latest .dmg directly from:`);
    console.log(c('bold', `  ${releasesUrl}`));
  } else {
    console.log(`\nDownload the latest AppImage or .deb package from:`);
    console.log(c('bold', `  ${releasesUrl}`));
  }

  const openBrowser = await askQuestion('\nWould you like to open the releases page in your browser? (y/N)', 'N');
  if (openBrowser.toLowerCase() === 'y') {
    const cmd = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';
    execSync(`${cmd} ${releasesUrl}`);
  }
}

main().catch((err) => {
  console.error(c('red', 'Unexpected error: ' + err.message));
  process.exit(1);
});
