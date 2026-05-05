import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
    const identifier = 'koreki-admin';
    const user = await prisma.user.upsert({
        where: { username: identifier } as any,
        update: {
            role: 'ADMIN'
        },
        create: {
            username: identifier,
            hasProAccess: true,
            role: 'ADMIN'
        } as any,
    })
    console.log('Seeding user successful:', user)

    // Seed SystemSettings
    const settings = await prisma.systemSettings.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            id: 'singleton',
            ocrBudget: 100,
            correctionBudget: 100,
            ocrPricePerMillion: 0.1,
            correctionPricePerMillion: 0.1,
            lastResetMonth: new Date().getMonth() + 1,
            lastResetYear: new Date().getFullYear()
        }
    })
    console.log('Seeding settings successful:', settings)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('Seeding failed:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
