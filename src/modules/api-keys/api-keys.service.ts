import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
    constructor(private readonly prisma: PrismaService) { }

    async createApiKey(userId: string, projectId: string, name: string) {
        // Verify project belongs to user
        const project = await this.prisma.project.findUnique({
            where: { id: projectId, userId }
        });

        if (!project) throw new NotFoundException('Project not found');

        // Generate traceflux_sk_xxxxxxxxx
        const randomHex = crypto.randomBytes(16).toString('hex');
        const key = `traceflux_sk_${randomHex}`;

        const apiKey = await this.prisma.apiKey.create({
            data: {
                name: name || 'Default Key',
                key,
                projectId,
            },
        });

        return {
            success: true,
            status: 201,
            message: 'API Key created successfully',
            data: apiKey,
        };
    }

    async getApiKeys(userId: string, projectId: string) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId, userId }
        });

        if (!project) throw new NotFoundException('Project not found');

        const apiKeys = await this.prisma.apiKey.findMany({
            where: { projectId }
        });

        return {
            success: true,
            status: 200,
            message: 'API Keys retrieved successfully',
            data: apiKeys,
        };
    }

    async deleteApiKey(userId: string, id: string) {
        // Verify ownership via project
        const apiKey = await this.prisma.apiKey.findUnique({
            where: { id },
            include: { project: true }
        });

        if (!apiKey || apiKey.project.userId !== userId) {
            throw new NotFoundException('API Key not found or unauthorized');
        }

        const deletedKey = await this.prisma.apiKey.delete({ where: { id } });

        return {
            success: true,
            status: 200,
            message: 'API Key deleted successfully',
            data: deletedKey,
        };
    }
}
