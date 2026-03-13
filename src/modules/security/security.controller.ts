import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { SecurityService } from './security.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('telemetry/security')
@UseGuards(AuthGuard('jwt'))
export class SecurityController {
    constructor(private readonly securityService: SecurityService) { }

    @Get('request/:requestId')
    async getRequestReport(@Req() req: any, @Param('requestId') requestId: string) {
        return this.securityService.getReportByRequest(req.user.projectId, requestId);
    }

    @Get('endpoint/:endpointId')
    async getEndpointAggregate(@Req() req: any, @Param('endpointId') endpointId: string) {
        return this.securityService.getAggregateByEndpoint(req.user.projectId, endpointId);
    }

    @Get('project')
    async getProjectSummary(@Req() req: any) {
        return this.securityService.getProjectSummary(req.user.projectId);
    }
}
