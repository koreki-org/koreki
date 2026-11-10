import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Waechter fuer die Release-Regeln (Skill `release`).
 *
 * Seit dem 10.11.2026 gilt:
 * 1. Releases entstehen als Entwurf; veroeffentlicht wird erst nach Freigabe
 *    der Release Notes. Veroeffentlichen verteilt die Version ueber den
 *    Desktop-Updater an jede installierte App — es ist der Freigabe-Schritt.
 * 2. Bis auf Widerruf nur Pre-Releases.
 *
 * Daraus folgt eine technische Falle: GitHubs `releases/latest` zaehlt
 * Pre-Releases nicht mit. Ein Updater, der dort fragt, faende nie etwas. Er
 * fragt deshalb die latest.json im Branch `update-kanal`, die update-channel.yml
 * beim Veroeffentlichen schreibt. Ein Branch, weil im Repo unveraenderliche
 * Releases gelten: ein Kanal-RELEASE nahm keine neue Datei an (v0.9.99).
 *
 * Wer die Pre-Release-Regel aufhebt, aendert diesen Test bewusst mit — und den
 * Skill dazu.
 */

const ROOT = join(__dirname, '..', '..');
const lies = (pfad: string) => readFileSync(join(ROOT, pfad), 'utf8');

describe('Release-Governance', () => {
    it('Desktop-Releases entstehen als Entwurf und als Pre-Release', () => {
        const wf = lies('.github/workflows/desktop-release.yml');
        expect(wf).toMatch(/^\s*releaseDraft:\s*true\s*$/m);
        expect(wf).toMatch(/^\s*prerelease:\s*true\s*$/m);
    });

    it('Desktop-Releases werden signiert und bringen Update-Pakete mit', () => {
        const wf = lies('.github/workflows/desktop-release.yml');
        expect(wf).toContain('TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}');
        expect(wf).toContain('--config src-tauri/tauri.release.conf.json');
        const release = JSON.parse(lies('src-tauri/tauri.release.conf.json'));
        expect(release.bundle.createUpdaterArtifacts).toBe(true);
    });

    it('der Updater fragt den Kanal-Branch, nicht releases/latest', () => {
        const conf = JSON.parse(lies('src-tauri/tauri.conf.json'));
        const endpunkte: string[] = conf.plugins.updater.endpoints;
        expect(endpunkte).toEqual([
            'https://raw.githubusercontent.com/koreki-org/koreki/update-kanal/latest.json'
        ]);
        expect(conf.plugins.updater.pubkey).toMatch(/^[A-Za-z0-9+/=]{40,}$/);
    });

    it('der Kanal wird erst beim Veroeffentlichen gefuellt', () => {
        const pfad = '.github/workflows/update-channel.yml';
        expect(existsSync(join(ROOT, pfad))).toBe(true);
        const wf = lies(pfad);
        expect(wf).toMatch(/release:\s*\n\s*types:\s*\[published\]/);
        expect(wf).toContain('git push -q origin update-kanal');
        // Veroeffentlichte Releases sind unveraenderlich — dorthin hochladen scheitert.
        expect(wf).not.toContain('gh release upload');
        expect(wf).not.toMatch(/^\s*push:\s*$/m); // Ausloeser `push:`, nicht `push: true` der Docker-Aktion
    });

    it('das Community-Image wird erst nach der Freigabe gebaut, ohne latest fuer Pre-Releases', () => {
        const wf = lies('.github/workflows/community-release.yml');
        expect(wf).toMatch(/release:\s*\n\s*types:\s*\[published\]/);
        expect(wf).not.toMatch(/^\s*push:\s*$/m); // Ausloeser `push:`, nicht `push: true` der Docker-Aktion
        expect(wf).toContain('!github.event.release.prerelease');
    });
});
