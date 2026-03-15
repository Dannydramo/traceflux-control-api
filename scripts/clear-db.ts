import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

async function main() {

  const prisma = new PrismaClient();
  console.log('--- Clearing Database ---');

  try {
    // Order of deletion: most dependent to least dependent
    // Note: CASCADE in schema handles some, but let's be thorough
    
    console.log('Cleaning SecurityReports...');
    await prisma.securityReport.deleteMany({});

    console.log('Cleaning ApiRequests...');
    await prisma.apiRequest.deleteMany({});

    console.log('Cleaning Spans...');
    await prisma.span.deleteMany({});

    console.log('Cleaning Traces...');
    await prisma.trace.deleteMany({});

    console.log('Cleaning Logs...');
    await prisma.log.deleteMany({});

    console.log('Cleaning Dependencies...');
    await prisma.dependency.deleteMany({});

    console.log('Cleaning Endpoints...');
    await prisma.endpoint.deleteMany({});

    console.log('Cleaning ApiKeys...');
    await prisma.apiKey.deleteMany({});

    console.log('Cleaning Services...');
    await prisma.service.deleteMany({});

    console.log('Cleaning Projects...');
    await prisma.project.deleteMany({});

    console.log('Cleaning Users...');
    await prisma.user.deleteMany({});

    console.log('--- Database Cleared Successfully ---');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

