import prisma from '../prisma';
import { EXPERT_REGISTRY } from '@/prompts/expert-profiles';
import { isSameName, nameTakenMessage } from './profile-naming';

/**
 * Industrial Prompt Profile Service (Stage 16)
 * 🏮🛡️🏛️
 * Centralized domain service for managing pedagogical prompt profiles.
 * Decouples business logic from the API transport layer.
 */
export const PromptProfileService = {
    /**
     * Returns the system default profiles from the Markdown library.
     * These are the "factory settings" for different subjects.
     */
    getSystemDefaults() {
        return Object.values(EXPERT_REGISTRY).map(entry => ({
            id: entry.metadata.id,
            name: entry.metadata.name,
            isSystem: true,
            correctionPrompt: entry.promptSnippet
        }));
    },

    /**
     * Synchronizes system default profiles into the database.
     * Ensures all subject-specific templates are available for all users.
     */
    async syncSystemProfiles() {
        const defaults = this.getSystemDefaults();
        const results = [];

        for (const p of defaults) {
            const existing = await prisma.promptProfile.findFirst({
                where: { name: p.name, isSystem: true }
            });

            if (existing) {
                results.push(await prisma.promptProfile.update({
                    where: { id: existing.id },
                    data: { correctionPrompt: p.correctionPrompt }
                }));
            } else {
                results.push(await prisma.promptProfile.create({
                    data: { 
                        name: p.name, 
                        isSystem: true, 
                        correctionPrompt: p.correctionPrompt, 
                        userId: null 
                    }
                }));
            }
        }
        return results;
    },

    /**
     * Fetches all visible profiles for a specific user.
     * Includes global system profiles and personal user profiles.
     */
    async getAvailableProfiles(userId: string) {
        return prisma.promptProfile.findMany({
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
     * Upserts a personal or system profile.
     * Enforces permission rules: only admins can edit system profiles.
     */
    async upsertProfile(userId: string, data: { name: string, correctionPrompt: string }, userRole: string = 'USER') {
        // Enforce system-profile protection
        const existingSystem = await prisma.promptProfile.findFirst({
            where: { name: data.name, isSystem: true }
        });

        if (existingSystem && userRole !== 'ADMIN') {
            throw new Error('System-Profile können nicht direkt geändert werden.');
        }

        // 🏮 Siehe SkillProfileService.upsertProfile: Die Sperre der Datenbank
        // vergleicht exakt, die Rückfrage vor dem Überschreiben nach
        // `isSameName`. Ohne diese Auflösung entstünde bei abweichender
        // Schreibweise eine zweite Zeile.
        const eigene = await prisma.promptProfile.findMany({
            where: { userId },
            select: { name: true }
        });
        const zielName = eigene.find(p => isSameName(p.name, data.name))?.name || data.name;

        return prisma.promptProfile.upsert({
            where: {
                name_userId: {
                    name: zielName,
                    userId: userId
                }
            },
            update: { 
                correctionPrompt: data.correctionPrompt,
                userId: userId
            },
            create: { 
                name: data.name, 
                correctionPrompt: data.correctionPrompt, 
                userId: userId, 
                isSystem: false 
            }
        });
    },

    /**
     * Renames a personal profile.
     * Blocks renaming of system profiles.
     */
    async renameProfile(userId: string, id: string, newName: string) {
        const profile = await prisma.promptProfile.findUnique({ where: { id } });
        
        if (!profile || profile.userId !== userId) {
            throw new Error('Profil nicht gefunden oder kein Zugriff');
        }
        if (profile.isSystem) {
            throw new Error('System-Profile können nicht umbenannt werden');
        }

        // Duplicate check — nach derselben Namensgleichheit wie überall sonst.
        const eigene = await prisma.promptProfile.findMany({
            where: { userId },
            select: { id: true, name: true }
        });

        if (eigene.some(p => p.id !== id && isSameName(p.name, newName))) {
            throw new Error(nameTakenMessage('Profil'));
        }

        return prisma.promptProfile.update({
            where: { id },
            data: { name: newName }
        });
    },

    /**
     * Deletes a profile.
     * Admins can delete anything; users only their own.
     */
    async deleteProfile(userId: string, id: string, userRole: string = 'USER') {
        const profile = await prisma.promptProfile.findUnique({ where: { id } });
        
        if (!profile) throw new Error('Profil nicht gefunden');

        if (profile.isSystem && userRole !== 'ADMIN') {
            throw new Error('System-Profile können nur von Admins gelöscht werden');
        }

        if (!profile.isSystem && profile.userId !== userId && userRole !== 'ADMIN') {
            throw new Error('Nicht autorisiert');
        }

        return prisma.promptProfile.delete({ where: { id } });
    }
};
