import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Controller()
@UseGuards(AuthGuard('jwt')) // Protect all API Keys endpoints
export class ApiKeysController {
    constructor(private readonly prisma: PrismaService) { }

    @Post('projects/:projectId/api-keys')
    async createApiKey(@Request() req, @Param('projectId') projectId: string, @Body('name') name: string) {
        const userId = req.user.id;

        // Verify project belongs to user
        const project = await this.prisma.project.findUnique({
            where: { id: projectId, userId }
        });

        if (!project) throw new NotFoundException('Project not found');

        // Generate traceflux_sk_xxxxxxxxx
        const randomHex = crypto.randomBytes(16).toString('hex');
        const key = `traceflux_sk_${randomHex}`;

        return this.prisma.apiKey.create({
            data: {
                name: name || 'Default Key',
                key,
                projectId,
            },
        });
    }

    @Get('projects/:projectId/api-keys')
    async getApiKeys(@Request() req, @Param('projectId') projectId: string) {
        const userId = req.user.id;

        const project = await this.prisma.project.findUnique({
            where: { id: projectId, userId }
        });

        if (!project) throw new NotFoundException('Project not found');

        return this.prisma.apiKey.findMany({
            where: { projectId }
        });
    }

    @Delete('api-keys/:id')
    async deleteApiKey(@Request() req, @Param('id') id: string) {
        const userId = req.user.id;

        // Verify ownership via project
        const apiKey = await this.prisma.apiKey.findUnique({
            where: { id },
            include: { project: true }
        });

        if (!apiKey || apiKey.project.userId !== userId) {
            throw new NotFoundException('API Key not found or unauthorized');
        }

        return this.prisma.apiKey.delete({ where: { id } });
    }
}
