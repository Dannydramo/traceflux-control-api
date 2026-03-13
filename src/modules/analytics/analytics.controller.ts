import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Request() req) {
    return this.analyticsService.getOverview(req.user.id);
  }

  @Get('requests-over-time')
  getRequestsOverTime(@Request() req) {
    return this.analyticsService.getRequestsOverTime(req.user.id);
  }

  @Get('latency-trend')
  getLatencyTrend(@Request() req) {
    return this.analyticsService.getLatencyTrend(req.user.id);
  }

  @Get('error-rate-over-time')
  getErrorRateOverTime(@Request() req) {
    return this.analyticsService.getErrorRateOverTime(req.user.id);
  }

  @Get('endpoints')
  getEndpoints(@Request() req) {
    return this.analyticsService.getEndpoints(req.user.id);
  }

  @Get('endpoints/:id')
  async getEndpointDetail(@Request() req, @Param('id') id: string) {
    const detail = await this.analyticsService.getEndpointDetail(req.user.id, id);
    if (!detail) throw new NotFoundException('Endpoint not found');
    return detail;
  }

  @Get('requests')
  getRequests(
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

  @Get('errors')
  getErrorOverview(@Request() req) {
    return this.analyticsService.getErrorOverview(req.user.id);
  }

  @Get('latency')
  getLatencyOverview(@Request() req) {
    return this.analyticsService.getLatencyOverview(req.user.id);
  }
}
