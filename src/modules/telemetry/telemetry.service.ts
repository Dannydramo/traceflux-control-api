import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class TelemetryService {
    constructor(
        private prisma: PrismaService,
        private analyticsService: AnalyticsService
    ) { }

    async getServices(userId: string) {
        const services = await this.prisma.service.findMany({
            where: { project: { userId } }
        });
        return {
            success: true,
            status: 200,
            message: 'Services retrieved successfully',
            data: services,
        };
    }

    async getLogs(userId: string, serviceId?: string, limit = 100) {
        const projects = await this.prisma.project.findMany({
            where: { userId },
            select: { id: true }
        });
        const projectIds = projects.map(p => p.id);

        const whereClause: any = { projectId: { in: projectIds } };
        if (serviceId) {
            whereClause.serviceId = serviceId;
        }

        const logs = await this.prisma.log.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            take: Number(limit)
        });

        return {
            success: true,
            status: 200,
            message: 'Logs retrieved successfully',
            data: logs,
        };
    }

    async getDependencies(userId: string, projectId?: string) {
        const projects = await this.prisma.project.findMany({
            where: { userId },
            select: { id: true }
        });
        const projectIds = projects.map(p => p.id);

        const qProjectId = projectId && projectIds.includes(projectId) ? projectId : undefined;

        const dependencies = await this.prisma.dependency.findMany({
            where: {
                projectId: qProjectId ? qProjectId : { in: projectIds }
            },
            orderBy: { callCount: 'desc' }
        });

        return {
            success: true,
            status: 200,
            message: 'Dependencies retrieved successfully',
            data: dependencies,
        };
    }
}
