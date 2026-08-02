#!/usr/bin/env node

/**
 * 🏮 Koreki Universal Setup Wizard & CLI
 * Single-command setup for Koreki Community, SaaS, and Desktop editions.
 */

import readline from 'node:readline';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
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

  // Ensure we are in the correct directory (e.g., if cloned into a subfolder) BEFORE looking for .env
  ensureRepoFilesExist();

  const envPath = path.join(TARGET_DIR, '.env');
  let envContent = '';
  let appUrl = 'http://localhost:8080';
  let isUpdate = false;

  if (fs.existsSync(envPath)) {
    console.log(c('cyan', '\n📝 Existing Koreki installation detected.'));
    const action = await askQuestion('Do you want to (U)pdate safely or (R)econfigure from scratch? [U/R]', 'U');
    if (action.toLowerCase() === 'u') {
      isUpdate = true;
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Extract APP_URL for the Keycloak realm injection later
      const matchAppUrl = envContent.match(/^APP_URL=(.*)$/m);
      if (matchAppUrl) appUrl = matchAppUrl[1].trim();

      console.log(c('green', '✔ Proceeding with safe update (config and passwords preserved)...'));
    }
  }

  let adminPassword = '*****'; // Masked for update console output
  let dbPassword = '*****';

  if (!isUpdate) {
    appUrl = await askQuestion('Public URL (how users access Koreki)', 'http://localhost:8080');
    if (!/^https?:\/\//i.test(appUrl)) {
      appUrl = `http://${appUrl}`;
    }
    appUrl = appUrl.replace(/\/+$/, '');
    
    // Parse URL to extract hostname and port for Keycloak configuration
    let parsedUrl;
    try {
      parsedUrl = new URL(appUrl);
    } catch {
      console.log(c('red', `✖ Invalid URL: ${appUrl}`));
      process.exit(1);
    }
    const appHostname = parsedUrl.hostname;
    const isHttps = parsedUrl.protocol === 'https:';
    // External port from the URL (what users/browsers see)
    const externalPort = parsedUrl.port || (isHttps ? '443' : '80');

    // Docker host port: which port Docker binds Nginx to on this machine
    const isLocalhost = appHostname === 'localhost' || appHostname === '127.0.0.1';
    let publicPort;
    if (isLocalhost) {
      // Localhost: port comes directly from the URL
      publicPort = parsedUrl.port || '8080';
    } else {
      // Domain behind reverse proxy: ask which local port to bind to
      publicPort = await askQuestion('Port auf diesem Server', '8080');
    }

    const mistralKey = await askQuestion('Mistral API Key (Optional)', '');
    
    adminPassword = generateSecret(12);
    dbPassword = generateSecret(16);

    // Keycloak port: -1 means "use default" (omit port from URLs) for standard ports (443/80)
    const isStandardPort = (isHttps && externalPort === '443') || (!isHttps && externalPort === '80');
    const kcHostnamePort = isStandardPort ? '-1' : externalPort;

    envContent = `
# Koreki Community Multi-User Configuration
APP_URL=${appUrl}
APP_HOSTNAME=${appHostname}
PUBLIC_PORT=${publicPort}
KC_HOSTNAME_PORT=${kcHostnamePort}

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
  }

  // Inject dynamic appUrl into keycloak realm config
  try {
    const realmFile = path.join(TARGET_DIR, 'keycloak/koreki-realm.json');
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

  const composeFile = 'docker-compose.community-multi-full.yml';

  console.log('\n' + c('bold', '🔑 Generated Credentials:'));
  console.log(`   • Keycloak Admin User:     ${c('green', 'admin')}`);
  console.log(`   • Keycloak Admin Password: ${c('yellow', adminPassword)}`);
  console.log(`   • Database Password:       ${c('dim', dbPassword)}`);

  console.log('\n' + c('bold', '👤 Koreki App-Administrator:'));
  console.log(`   Der Realm legt den Benutzer ${c('green', 'koreki')} mit Admin-Rolle an — bewusst OHNE Passwort,`);
  console.log(`   damit keine Installation mit einem bekannten Standard-Zugang startet.`);
  console.log(`   Passwort einmalig setzen unter: ${c('cyan', appUrl + '/auth')} (Login: admin)`);

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
    if (isUpdate) {
      console.error(c('red', '\n❌ Failed to update and start Docker stack: ' + err.message));
      console.log(c('yellow', 'Your data and configuration are safe. Check the logs with: docker compose logs'));
    } else {
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

// Helper: Fetch JSON from a URL (follows redirects, sets required GitHub User-Agent)
function fetchJson(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'koreki-cli-installer' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchJson(res.headers.location, redirectCount + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Helper: Download a file with a live progress indicator (follows redirects)
function downloadFile(url, destPath, totalSize = 0, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'koreki-cli-installer' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(downloadFile(res.headers.location, destPath, totalSize, redirectCount + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const size = totalSize || parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;
      const file = fs.createWriteStream(destPath);

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        const mb = (downloaded / 1024 / 1024).toFixed(1);
        if (size) {
          const pct = Math.min(100, Math.round((downloaded / size) * 100));
          process.stdout.write(`\r   ${pct}% (${mb} MB)`);
        } else {
          process.stdout.write(`\r   ${mb} MB`);
        }
      });

      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function printManualFallback(releasesUrl) {
  console.log(c('bold', `\n👉 Please download and install manually from:\n   ${releasesUrl}`));
}

async function maybeOpenBrowser(platform, releasesUrl) {
  const openBrowser = await askQuestion('\nWould you like to open the releases page in your browser? (y/N)', 'N');
  if (openBrowser.toLowerCase() === 'y') {
    const cmd = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';
    execSync(`${cmd} ${releasesUrl}`);
  }
}

// Downloads the matching asset from the latest GitHub release and hands it to installFn.
// Returns true if a matching asset was found (regardless of install success), false if it
// fell back to onNotFound (no such asset published yet, or GitHub unreachable).
async function installFromRelease(assetPattern, installFn, releasesUrl, onNotFound) {
  // Note: intentionally NOT using /releases/latest — Koreki's releases are
  // currently tagged as prereleases, which that endpoint always excludes (404).
  const apiUrl = 'https://api.github.com/repos/koreki-org/koreki/releases?per_page=1';
  const notFound = onNotFound || (() => printManualFallback(releasesUrl));

  console.log(c('cyan', '\n🔎 Checking latest release on GitHub...'));
  let release;
  try {
    const releases = await fetchJson(apiUrl);
    release = Array.isArray(releases) ? releases[0] : null;
    if (!release) throw new Error('No releases found');
  } catch (err) {
    console.log(c('red', `✖ Could not reach GitHub: ${err.message}`));
    notFound();
    return false;
  }

  const asset = (release.assets || []).find((a) => assetPattern.test(a.name));
  if (!asset) {
    console.log(c('yellow', '✖ No matching installer found in the latest release.'));
    notFound();
    return false;
  }

  const destPath = path.join(os.tmpdir(), asset.name);
  console.log(c('bold', `⬇️  Downloading ${asset.name} (${release.tag_name})...`));

  try {
    await downloadFile(asset.browser_download_url, destPath, asset.size);
    console.log(c('green', '\n✔ Download complete.'));
  } catch (err) {
    console.log(c('red', `\n✖ Download failed: ${err.message}`));
    notFound();
    return false;
  }

  try {
    await installFn(destPath);
    console.log(c('green', '\n✅ Koreki Desktop was installed successfully!'));
  } catch (err) {
    console.log(c('red', `\n✖ Installation failed: ${err.message}`));
    console.log(c('yellow', `You can run the installer manually: ${destPath}`));
  }
  return true;
}

async function installWindows(installerPath) {
  console.log(c('bold', '\n🚀 Running installer (silent mode, no admin rights required)...'));
  const result = spawnSync(installerPath, ['/S'], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Installer exited with code ${result.status}`);
  }
}

async function installMacDmg(dmgPath) {
  console.log(c('bold', '\n🚀 Mounting disk image...'));
  const mountResult = spawnSync('hdiutil', ['attach', dmgPath, '-nobrowse', '-plist'], { encoding: 'utf8' });
  if (mountResult.status !== 0) {
    throw new Error(`hdiutil attach failed: ${mountResult.stderr || `exit code ${mountResult.status}`}`);
  }

  const mountMatch = mountResult.stdout.match(/<key>mount-point<\/key>\s*<string>([^<]+)<\/string>/);
  const mountPoint = mountMatch ? mountMatch[1] : null;
  if (!mountPoint) {
    throw new Error('Could not determine the mount point of the disk image.');
  }

  try {
    const appName = fs.readdirSync(mountPoint).find((f) => f.endsWith('.app'));
    if (!appName) {
      throw new Error('No .app bundle found inside the disk image.');
    }

    console.log(c('bold', `\n🚀 Installing ${appName} to /Applications...`));
    const copyResult = spawnSync('cp', ['-R', path.join(mountPoint, appName), path.join('/Applications', appName)], { stdio: 'inherit' });
    if (copyResult.status !== 0) {
      throw new Error(`Copying to /Applications failed with exit code ${copyResult.status}`);
    }
  } finally {
    spawnSync('hdiutil', ['detach', mountPoint, '-quiet'], { stdio: 'ignore' });
  }
}

function printMacManualFallback(releasesUrl) {
  console.log(`\nTo install Koreki Desktop on macOS via Homebrew:`);
  console.log(c('cyan', c('bold', '  brew install --cask koreki')));
  console.log(`\nOr download the latest .dmg directly from:`);
  console.log(c('bold', `  ${releasesUrl}`));
}

async function installLinuxDeb(debPath) {
  console.log(c('yellow', '\nThis installs Koreki Desktop system-wide via "sudo apt install" and will ask for your password.'));
  const confirm = await askQuestion('Continue? (Y/n)', 'Y');
  if (confirm.toLowerCase() === 'n') {
    throw new Error('Installation cancelled by user.');
  }

  console.log(c('bold', '\n🚀 Installing .deb package via apt...'));
  const result = spawnSync('sudo', ['apt', 'install', '-y', debPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`apt install exited with code ${result.status}`);
  }
}

// Option 4: Desktop App
async function setupDesktopApp(platform) {
  console.log(c('bold', '💻 Koreki Desktop Application Installer'));

  const releasesUrl = 'https://github.com/koreki-org/koreki/releases/latest';

  if (platform === 'win32') {
    await installFromRelease(/_x64-setup\.exe$/i, installWindows, releasesUrl);
  } else if (platform === 'linux') {
    if (isCommandAvailable('apt') || isCommandAvailable('apt-get')) {
      await installFromRelease(/_amd64\.deb$/i, installLinuxDeb, releasesUrl);
    } else {
      console.log(c('yellow', '\nAutomatic install is currently only supported for Debian/Ubuntu (apt).'));
      console.log(`Download the latest AppImage, .deb or .rpm package from:`);
      console.log(c('bold', `  ${releasesUrl}`));
      await maybeOpenBrowser(platform, releasesUrl);
    }
  } else if (platform === 'darwin') {
    // Tauri names macOS dmg assets by arch, e.g. koreki_x.y.z_aarch64.dmg / _x64.dmg
    const arch = os.arch() === 'arm64' ? 'aarch64' : 'x64';
    const assetPattern = new RegExp(`_${arch}\\.dmg$`, 'i');
    const found = await installFromRelease(assetPattern, installMacDmg, releasesUrl, () => printMacManualFallback(releasesUrl));
    if (!found) {
      await maybeOpenBrowser(platform, releasesUrl);
    }
  } else {
    printManualFallback(releasesUrl);
    await maybeOpenBrowser(platform, releasesUrl);
  }
}

main().catch((err) => {
  console.error(c('red', 'Unexpected error: ' + err.message));
  process.exit(1);
});
