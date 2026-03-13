import { Controller, Get, Param, Request, UseGuards, UnauthorizedException, Query, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@UseGuards(AuthGuard('jwt'))
@Controller('telemetry')
export class TelemetryController {
    constructor(
        private prisma: PrismaService,
        private analyticsService: AnalyticsService
    ) { }

    @Get('services')
    async getServices(@Request() req) {
        return this.prisma.service.findMany({
            where: { project: { userId: req.user.id } }
        });
    }

    @Get('endpoints')
    async getEndpoints(@Request() req) {
        return this.analyticsService.getEndpoints(req.user.id);
    }

    @Get('endpoints/:id')
    async getEndpointDetail(@Request() req, @Param('id') id: string) {
        const detail = await this.analyticsService.getEndpointDetail(req.user.id, id);
        if (!detail) throw new NotFoundException('Endpoint not found');
        return detail;
    }

    @Get('requests')
    async getRequests(
        @Request() req,
        @Query('endpoint') endpoint?: string,
        @Query('status') status?: string,
        @Query('minLatency') minLatency?: string,
        @Query('maxLatency') maxLatency?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        return this.analyticsService.getRequests(req.user.id, {
            endpoint,
            status,
            minLatency: minLatency ? parseFloat(minLatency) : undefined,
            maxLatency: maxLatency ? parseFloat(maxLatency) : undefined,
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        });
    }

    @Get('traces/:traceId')
    async getTrace(@Request() req, @Param('traceId') traceId: string) {
        const trace = await this.analyticsService.getTrace(req.user.id, traceId);
        if (!trace) throw new NotFoundException('Trace not found');
        return trace;
    }

    @Get('logs')
    async getLogs(
        @Request() req,
        @Query('serviceId') serviceId?: string,
        @Query('limit') limit = 100
    ) {
        const projects = await this.prisma.project.findMany({
            where: { userId: req.user.id },
            select: { id: true }
        });
        const projectIds = projects.map(p => p.id);

        const whereClause: any = { projectId: { in: projectIds } };
        if (serviceId) {
            whereClause.serviceId = serviceId;
        }

        return this.prisma.log.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            take: Number(limit)
        });
    }

    @Get('dependencies')
    async getDependencies(@Request() req, @Query('projectId') projectId?: string) {
        const projects = await this.prisma.project.findMany({
            where: { userId: req.user.id },
            select: { id: true }
        });
        const projectIds = projects.map(p => p.id);

        const qProjectId = projectId && projectIds.includes(projectId) ? projectId : undefined;

        return this.prisma.dependency.findMany({
            where: {
                projectId: qProjectId ? qProjectId : { in: projectIds }
            },
            orderBy: { callCount: 'desc' }
        });
    }
}
