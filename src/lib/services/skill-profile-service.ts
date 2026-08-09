import prisma from '../prisma';
import { STANDARD_SKILL_PROFILES } from '../ai/standard-skills-profiles';
import { isSameName, nameTakenMessage } from './profile-naming';

/**
 * Industrial Skill Profile Service
 * 🏮🛡️🏛️
 * Centralized domain service for managing modular correction skill profiles.
 * Respects strict SQLite and PostgreSQL multi-platform Json operations.
 */
export const SkillProfileService = {
    /**
     * Returns the hardcoded system default skill profiles.
     */
    getSystemDefaults() {
        return STANDARD_SKILL_PROFILES;
    },

    /**
     * Synchronizes system default skill profiles into the database.
     * Ensures standard templates are available across all environments.
     */
    async syncSystemProfiles() {
        const defaults = this.getSystemDefaults();
        const results = [];

        for (const p of defaults) {
            const existing = await prisma.skillProfile.findFirst({
                where: { name: p.name, isSystem: true }
            });

            // Convert string[] to a database JSON-compatible string or array
            const activeSkillIdsJson = p.activeSkillIds;

            if (existing) {
                results.push(await prisma.skillProfile.update({
                    where: { id: existing.id },
                    data: { activeSkillIds: activeSkillIdsJson }
                }));
            } else {
                results.push(await prisma.skillProfile.create({
                    data: { 
                        name: p.name, 
                        isSystem: true, 
                        activeSkillIds: activeSkillIdsJson, 
                        userId: null 
                    }
                }));
            }
        }
        return results;
    },

    /**
     * Fetches all visible skill profiles for a specific user.
     * Includes global system presets and personal user profiles.
     */
    async getAvailableProfiles(userId: string) {
        return prisma.skillProfile.findMany({
            where: {
                OR: [
                    { isSystem: true },
                    { userId: userId }
                ]
            },
            orderBy: { name: 'asc' }
        });
    },

    /**
     * Upserts a personal or system skill profile.
     * Enforces permissions: only admins can edit system presets.
     */
    async upsertProfile(userId: string, data: { name: string, activeSkillIds: string[], customSkills?: any }, userRole: string = 'USER') {
        const existingSystem = await prisma.skillProfile.findFirst({
            where: { name: data.name, isSystem: true }
        });

        if (existingSystem && userRole !== 'ADMIN') {
            throw new Error('System-Skill-Profile können nicht direkt geändert werden.');
        }

        const activeSkillIdsJson = data.activeSkillIds;
        const customSkillsJson = data.customSkills || {};

        // 🏮 Die Eindeutigkeits-Sperre der Datenbank vergleicht exakt, die
        // Rückfrage vor dem Überschreiben aber nach `isSameName`. Ohne diese
        // Auflösung entstünde bei abweichender Schreibweise eine zweite Zeile,
        // obwohl der Nutzer dem Überschreiben zugestimmt hat. Die Liste ist je
        // Nutzer kurz — ein Vergleich in JS ist billiger als eine
        // datenbankspezifische Sortierregel (SQLite kennt kein
        // `mode: 'insensitive'`).
        const eigene = await prisma.skillProfile.findMany({
            where: { userId },
            select: { name: true }
        });
        const zielName = eigene.find(p => isSameName(p.name, data.name))?.name || data.name;

        return prisma.skillProfile.upsert({
            where: {
                name_userId: {
                    name: zielName,
                    userId: userId
                }
            },
            update: { 
                activeSkillIds: activeSkillIdsJson,
                customSkills: customSkillsJson,
                userId: userId
            },
            create: { 
                name: data.name, 
                activeSkillIds: activeSkillIdsJson, 
                customSkills: customSkillsJson,
                userId: userId, 
                isSystem: false 
            }
        });
    },

    /**
     * Renames a personal skill profile.
     * Blocks renaming of system profiles.
     */
    async renameProfile(userId: string, id: string, newName: string) {
        const profile = await prisma.skillProfile.findUnique({ where: { id } });
        
        if (!profile || profile.userId !== userId) {
            throw new Error('Skill-Profil nicht gefunden oder kein Zugriff');
        }
        if (profile.isSystem) {
            throw new Error('System-Skill-Profile können nicht umbenannt werden');
        }

        // Duplicate check — nach derselben Namensgleichheit wie überall sonst.
        const eigene = await prisma.skillProfile.findMany({
            where: { userId },
            select: { id: true, name: true }
        });

        if (eigene.some(p => p.id !== id && isSameName(p.name, newName))) {
            throw new Error(nameTakenMessage('Skill-Profil'));
        }

        return prisma.skillProfile.update({
            where: { id },
            data: { name: newName }
        });
    },

    /**
     * Deletes a skill profile.
     * Admins can delete anything; users can only delete their own.
     */
    async deleteProfile(userId: string, id: string, userRole: string = 'USER') {
        const profile = await prisma.skillProfile.findUnique({ where: { id } });
        
        if (!profile) throw new Error('Skill-Profil nicht gefunden');

        if (profile.isSystem && userRole !== 'ADMIN') {
            throw new Error('System-Skill-Profile können nur von Admins gelöscht werden');
        }

        if (!profile.isSystem && profile.userId !== userId && userRole !== 'ADMIN') {
            throw new Error('Nicht autorisiert');
        }

        return prisma.skillProfile.delete({ where: { id } });
    }
};
