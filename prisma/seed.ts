import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // Create User
    const user = await prisma.user.upsert({
        where: { email: 'admin@traceflux.com' },
        update: {},
        create: {
            email: 'admin@traceflux.com',
            password: 'hashed_password_placeholder', // Dummy password
            name: 'Admin User'
        }
    });

    console.log(`User created: ${user.id}`);

    // Create Project
    const project = await prisma.project.create({
        data: {
            name: 'Local Test Project',
            userId: user.id
        }
    });

    console.log(`Project created: ${project.id}`);

    // Create API Key
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
