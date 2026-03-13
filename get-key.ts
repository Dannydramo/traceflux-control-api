import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const key = await prisma.apiKey.findFirst();
    if (key) {
        console.log(`\n\n=== FOUND_KEY=${key.key} ===\n\n`);
    } else {
        console.log("\n\n=== NO_KEY_FOUND ===\n\n");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
