"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Seeding database...");
    const user = await prisma.user.upsert({
        where: { email: 'admin@traceflux.com' },
        update: {},
        create: {
            email: 'admin@traceflux.com',
            password: 'hashed_password_placeholder',
            name: 'Admin User'
        }
    });
    console.log(`User created: ${user.id}`);
    const project = await prisma.project.create({
        data: {
            name: 'Local Test Project',
            userId: user.id
        }
    });
    console.log(`Project created: ${project.id}`);
    const apiKey = await prisma.apiKey.upsert({
        where: { key: 'traceflux_sk_dummy123' },
        update: { projectId: project.id },
        create: {
            key: 'traceflux_sk_dummy123',
            name: 'Default Local Dev Key',
            projectId: project.id
        }
    });
    console.log(`API Key created: ${apiKey.key} for Project ${project.name}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map