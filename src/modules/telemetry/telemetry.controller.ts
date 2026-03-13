import { Controller, Get, Param, Request, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from '../analytics/analytics.service';
import { TelemetryService } from './telemetry.service';

@UseGuards(AuthGuard('jwt'))
@Controller('telemetry')
export class TelemetryController {
    constructor(
        private telemetryService: TelemetryService,
        private analyticsService: AnalyticsService
    ) { }

    @Get('services')
    async getServices(@Request() req) {
        return this.telemetryService.getServices(req.user.id);
    }

    @Get('endpoints')
    async getEndpoints(@Request() req) {
        return this.analyticsService.getEndpoints(req.user.id);
    }

    @Get('endpoints/:id')
    async getEndpointDetail(@Request() req, @Param('id') id: string) {
        return this.analyticsService.getEndpointDetail(req.user.id, id);
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
        return this.analyticsService.getTrace(req.user.id, traceId);
    }

    @Get('logs')
    async getLogs(
        @Request() req,
        @Query('serviceId') serviceId?: string,
        @Query('limit') limit = 100
    ) {
        return this.telemetryService.getLogs(req.user.id, serviceId, limit);
    }

    @Get('dependencies')
    async getDependencies(@Request() req, @Query('projectId') projectId?: string) {
        return this.telemetryService.getDependencies(req.user.id, projectId);
    }
}

