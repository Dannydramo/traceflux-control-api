const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const key = await prisma.apiKey.findFirst({
        include: { project: true }
    });
    console.log("Found API Key:", key?.key);
    console.log("Project ID:", key?.projectId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
