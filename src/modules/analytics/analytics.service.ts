import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) { }

  /** Get all project IDs belonging to a user */
  private async getUserProjectIds(userId: string): Promise<string[]> {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  }

  /** Overview metrics: totals + deltas vs previous period */
  async getOverview(userId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    if (projectIds.length === 0) {
      return {
        success: true,
        status: 200,
        message: 'No projects found',
        data: {
          totalRequests: 0,
          errorRate: 0,
          avgLatency: 0,
          activeEndpoints: 0,
          requestsDelta: 0,
          errorRateDelta: 0,
          latencyDelta: 0,
          endpointsDelta: 0,
        },
      };
    }


    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Current period (last 24h)
    const currentRequests = await this.prisma.apiRequest.findMany({
      where: { projectId: { in: projectIds }, timestamp: { gte: oneDayAgo } },
    });

    // Previous period (24-48h ago)
    const prevRequests = await this.prisma.apiRequest.findMany({
      where: {
        projectId: { in: projectIds },
        timestamp: { gte: twoDaysAgo, lt: oneDayAgo },
      },
    });

    const totalRequests = currentRequests.length;
    const totalErrors = currentRequests.filter((r) => r.status >= 400).length;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const avgLatency =
      totalRequests > 0
        ? currentRequests.reduce((sum, r) => sum + r.latencyMs, 0) / totalRequests
        : 0;
    const activeEndpoints = new Set(currentRequests.map((r) => r.path)).size;

    const prevTotal = prevRequests.length;
    const prevErrors = prevRequests.filter((r) => r.status >= 400).length;
    const prevErrorRate = prevTotal > 0 ? (prevErrors / prevTotal) * 100 : 0;
    const prevAvgLatency =
      prevTotal > 0
        ? prevRequests.reduce((sum, r) => sum + r.latencyMs, 0) / prevTotal
        : 0;
    const prevEndpoints = new Set(prevRequests.map((r) => r.path)).size;

    const delta = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    return {
      success: true,
      status: 200,
      message: 'Overview analytics retrieved',
      data: {
        totalRequests,
        errorRate: Math.round(errorRate * 100) / 100,
        avgLatency: Math.round(avgLatency * 100) / 100,
        activeEndpoints,
        requestsDelta: Math.round(delta(totalRequests, prevTotal) * 100) / 100,
        errorRateDelta: Math.round(delta(errorRate, prevErrorRate) * 100) / 100,
        latencyDelta: Math.round(delta(avgLatency, prevAvgLatency) * 100) / 100,
        endpointsDelta: Math.round(delta(activeEndpoints, prevEndpoints) * 100) / 100,
      },
    };

  }

  /** Requests over time (hourly buckets, last 24h) */
  async getRequestsOverTime(userId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    const buckets = this.generateHourlyBuckets(24);

    if (projectIds.length === 0) {
      return {
        success: true,
        status: 200,
        message: 'No data',
        data: {
          label: 'Requests',
          data: buckets.map((b) => ({ timestamp: b.toISOString(), value: 0 })),
        },
      };
    }


    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows: { hour: Date; count: bigint }[] = await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('hour', timestamp) as hour, count(*)::bigint as count
       FROM api_requests
       WHERE "projectId" = ANY($1) AND timestamp >= $2
       GROUP BY hour ORDER BY hour`,
      projectIds,
      since,
    );

    const map = new Map(rows.map((r) => [new Date(r.hour).toISOString(), Number(r.count)]));
    return {
      success: true,
      status: 200,
      message: 'Requests over time retrieved',
      data: {
        label: 'Requests',
        data: buckets.map((b) => ({
          timestamp: b.toISOString(),
          value: map.get(b.toISOString()) ?? 0,
        })),
      },
    };

  }

  /** Average latency over time (hourly buckets, last 24h) */
  async getLatencyTrend(userId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    const buckets = this.generateHourlyBuckets(24);

    if (projectIds.length === 0) {
      return {
        success: true,
        status: 200,
        message: 'No projects found',
        data: {
          label: 'Latency (ms)',
          data: buckets.map((b) => ({ timestamp: b.toISOString(), value: 0 })),
        },
      };
    }


    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows: { hour: Date; avg: number }[] = await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('hour', timestamp) as hour, avg("latencyMs") as avg
       FROM api_requests
       WHERE "projectId" = ANY($1) AND timestamp >= $2
       GROUP BY hour ORDER BY hour`,
      projectIds,
      since,
    );

    const map = new Map(rows.map((r) => [new Date(r.hour).toISOString(), Math.round(Number(r.avg) * 100) / 100]));
    return {
      success: true,
      status: 200,
      message: 'Latency trend retrieved',
      data: {
        label: 'Latency (ms)',
        data: buckets.map((b) => ({
          timestamp: b.toISOString(),
          value: map.get(b.toISOString()) ?? 0,
        })),
      },
    };
  }


  /** Error rate over time (hourly buckets, last 24h) */
  async getErrorRateOverTime(userId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    const buckets = this.generateHourlyBuckets(24);

    if (projectIds.length === 0) {
      return {
        success: true,
        status: 200,
        message: 'No projects found',
        data: {
          label: 'Error Rate (%)',
          data: buckets.map((b) => ({ timestamp: b.toISOString(), value: 0 })),
        },
      };
    }


    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows: { hour: Date; total: bigint; errors: bigint }[] =
      await this.prisma.$queryRawUnsafe(
        `SELECT date_trunc('hour', timestamp) as hour,
                count(*)::bigint as total,
                count(*) FILTER (WHERE status >= 400)::bigint as errors
         FROM api_requests
         WHERE "projectId" = ANY($1) AND timestamp >= $2
         GROUP BY hour ORDER BY hour`,
        projectIds,
        since,
      );

    const map = new Map(
      rows.map((r) => {
        const total = Number(r.total);
        const errors = Number(r.errors);
        return [new Date(r.hour).toISOString(), total > 0 ? Math.round((errors / total) * 10000) / 100 : 0];
      }),
    );

    return {
      success: true,
      status: 200,
      message: 'Error rate over time retrieved',
      data: {
        label: 'Error Rate (%)',
        data: buckets.map((b) => ({
          timestamp: b.toISOString(),
          value: map.get(b.toISOString()) ?? 0,
        })),
      },
    };
  }


  /** Endpoint summaries */
  async getEndpoints(userId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    if (projectIds.length === 0) {
      return {
        success: true,
        status: 200,
        message: 'No endpoints found',
        data: [],
      };
    }


    const rows: {
      path: string;
      method: string;
      total: bigint;
      errors: bigint;
      avg_latency: number;
      p50: number;
      p95: number;
      p99: number;
    }[] = await this.prisma.$queryRawUnsafe(
      `SELECT path, method,
              count(*)::bigint as total,
              count(*) FILTER (WHERE status >= 400)::bigint as errors,
              avg("latencyMs") as avg_latency,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs") as p50,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") as p95,
              percentile_cont(0.99) WITHIN GROUP (ORDER BY "latencyMs") as p99
       FROM api_requests
       WHERE "projectId" = ANY($1)
       GROUP BY path, method
       ORDER BY total DESC`,
      projectIds,
    );

    return {
      success: true,
      status: 200,
      message: 'Endpoints list retrieved',
      data: rows.map((r) => {
        const total = Number(r.total);
        const errors = Number(r.errors);
        return {
          id: `${r.method}:${r.path}`,
          path: r.path,
          method: r.method,
          requests: total,
          avgLatency: Math.round(Number(r.avg_latency) * 100) / 100,
          errors,
          errorRate: total > 0 ? Math.round((errors / total) * 10000) / 100 : 0,
          p50Latency: Math.round(Number(r.p50) * 100) / 100,
          p95Latency: Math.round(Number(r.p95) * 100) / 100,
          p99Latency: Math.round(Number(r.p99) * 100) / 100,
        };
      }),
    };

  }

  /** Single endpoint detail */
  async getEndpointDetail(userId: string, endpointId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    if (projectIds.length === 0) return null;

    // endpointId is "METHOD:path"
    const [method, ...pathParts] = endpointId.split(':');
    const path = pathParts.join(':');

    const summary: {
      total: bigint;
      errors: bigint;
      avg_latency: number;
      p50: number;
      p95: number;
      p99: number;
    }[] = await this.prisma.$queryRawUnsafe(
      `SELECT count(*)::bigint as total,
              count(*) FILTER (WHERE status >= 400)::bigint as errors,
              avg("latencyMs") as avg_latency,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs") as p50,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") as p95,
              percentile_cont(0.99) WITHIN GROUP (ORDER BY "latencyMs") as p99
       FROM api_requests
       WHERE "projectId" = ANY($1) AND method = $2 AND path = $3`,
      projectIds,
      method,
      path,
    );


    const s = summary[0];
    const total = Number(s?.total ?? 0);
    const errors = Number(s?.errors ?? 0);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const buckets = this.generateHourlyBuckets(24);

    const latencyRows: { hour: Date; avg: number }[] = await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('hour', timestamp) as hour, avg("latencyMs") as avg
       FROM api_requests
       WHERE "projectId" = ANY($1) AND method = $2 AND path = $3 AND timestamp >= $4
       GROUP BY hour ORDER BY hour`,
      projectIds,
      method,
      path,
      since,
    );

    const requestRows: { hour: Date; count: bigint }[] = await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('hour', timestamp) as hour, count(*)::bigint as count
       FROM api_requests
       WHERE "projectId" = ANY($1) AND method = $2 AND path = $3 AND timestamp >= $4
       GROUP BY hour ORDER BY hour`,
      projectIds,
      method,
      path,
      since,
    );

    const [errorDist, statusDist, recentRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<{ status: number; count: bigint }[]>(
        `SELECT status, count(*)::bigint as count
         FROM api_requests
         WHERE "projectId" = ANY($1) AND method = $2 AND path = $3 AND status >= 400
         GROUP BY status ORDER BY count DESC`,
        projectIds,
        method,
        path,
      ),
      this.prisma.$queryRawUnsafe<{ status: number; count: bigint }[]>(
        `SELECT status, count(*)::bigint as count
         FROM api_requests
         WHERE "projectId" = ANY($1) AND method = $2 AND path = $3
         GROUP BY status ORDER BY status`,
        projectIds,
        method,
        path,
      ),
      this.prisma.apiRequest.findMany({
        where: {
          projectId: { in: projectIds },
          method,
          path,
        },
        orderBy: { timestamp: 'desc' },
        take: 20,
      }),
    ]);

    const latMap = new Map(latencyRows.map((r) => [new Date(r.hour).toISOString(), Math.round(Number(r.avg) * 100) / 100]));
    const reqMap = new Map(requestRows.map((r) => [new Date(r.hour).toISOString(), Number(r.count)]));

    return {
      success: true,
      status: 200,
      message: 'Endpoint detail retrieved',
      data: {
        id: endpointId,
        path,
        method,
        requests: total,
        avgLatency: Math.round(Number(s?.avg_latency ?? 0) * 100) / 100,
        errors,
        errorRate: total > 0 ? Math.round((errors / total) * 10000) / 100 : 0,
        p50Latency: Math.round(Number(s?.p50 ?? 0) * 100) / 100,
        p95Latency: Math.round(Number(s?.p95 ?? 0) * 100) / 100,
        p99Latency: Math.round(Number(s?.p99 ?? 0) * 100) / 100,
        latencyOverTime: buckets.map((b) => ({
          timestamp: b.toISOString(),
          value: latMap.get(b.toISOString()) ?? 0,
        })),
        requestsOverTime: buckets.map((b) => ({
          timestamp: b.toISOString(),
          value: reqMap.get(b.toISOString()) ?? 0,
        })),
        errorDistribution: errorDist.map((r) => ({
          statusCode: r.status,
          count: Number(r.count),
        })),
        statusDistribution: statusDist.map((r) => ({
          statusCode: r.status,
          count: Number(r.count),
        })),
        recentRequests: recentRows.map((r) => ({
          id: r.id,
          timestamp: r.timestamp.toISOString(),
          endpoint: r.path,
          method: r.method,
          statusCode: r.status,
          latency: r.latencyMs,
          traceId: r.id,
          requestBody: r.requestBody,
          requestHeaders: r.requestHeaders,
          errorStack: r.errorStack,
        })),
      },
    };
  }


  /** Paginated request log */
  async getRequests(
    userId: string,
    params: {
      endpoint?: string;
      status?: string;
      minLatency?: number;
      maxLatency?: number;
      page?: number;
      pageSize?: number;
    },
  ) {
    const projectIds = await this.getUserProjectIds(userId);
    if (projectIds.length === 0) {
      return {
        success: true,
        status: 200,
        message: 'No requests found',
        data: { results: [], total: 0, page: 1, pageSize: 25 },
      };
    }



    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 25, 100);
    const skip = (page - 1) * pageSize;

    const where: any = { projectId: { in: projectIds } };
    if (params.endpoint) where.path = { contains: params.endpoint };
    if (params.status) {
      // Support status class filters like "2xx", "4xx" or exact codes like "404"
      const match = params.status.match(/^(\d)xx$/i);
      if (match) {
        const base = parseInt(match[1], 10) * 100;
        where.status = { gte: base, lt: base + 100 };
      } else {
        const statusNum = parseInt(params.status, 10);
        if (!isNaN(statusNum)) where.status = statusNum;
      }
    }
    if (params.minLatency != null || params.maxLatency != null) {
      where.latencyMs = {};
      if (params.minLatency != null) where.latencyMs.gte = params.minLatency;
      if (params.maxLatency != null) where.latencyMs.lte = params.maxLatency;
    }

    const [data, total] = await Promise.all([
      this.prisma.apiRequest.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.apiRequest.count({ where }),
    ]);

    return {
      success: true,
      status: 200,
      message: 'Paginated requests retrieved',
      data: {
        results: data.map((r) => ({
          id: r.id,
          timestamp: r.timestamp.toISOString(),
          endpoint: r.path,
          method: r.method,
          statusCode: r.status,
          latency: r.latencyMs,
          traceId: r.id, // api_requests doesn't have traceId, use id as fallback
          requestBody: r.requestBody,
          requestHeaders: r.requestHeaders,
          errorStack: r.errorStack,
        })),
        total,
        page,
        pageSize,
      },

    };

  }

  /** Single request trace lookup */
  async getTrace(userId: string, traceId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    if (projectIds.length === 0) return null;

    const record = await this.prisma.apiRequest.findFirst({
      where: { id: traceId, projectId: { in: projectIds } },
    });

    if (!record) return null;

    return {
      success: true,
      status: 200,
      message: 'Trace retrieved',
      data: {
        id: record.id,
        traceId: record.id,
        timestamp: record.timestamp.toISOString(),
        endpoint: record.path,
        method: record.method,
        statusCode: record.status,
        totalDuration: record.latencyMs,
        requestBody: record.requestBody,
        requestHeaders: record.requestHeaders,
        errorStack: record.errorStack,
        spans: [
          {
            id: record.id,
            name: `${record.method} ${record.path}`,
            startTime: 0,
            duration: record.latencyMs,
            status: record.status < 400 ? 'ok' : 'error',
          },
        ],
      },
    };
  }


  /** Error overview */
  async getErrorOverview(userId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    if (projectIds.length === 0) {
      return {
        success: true,
        status: 200,
        message: 'No error data found',
        data: {
          totalErrors: 0,
          errorRate: 0,
          topErrors: [],
          errorsOverTime: [],
          errorsByStatus: [],
        },
      };
    }


    const [totalAll, totalErrors] = await Promise.all([
      this.prisma.apiRequest.count({ where: { projectId: { in: projectIds } } }),
      this.prisma.apiRequest.count({
        where: { projectId: { in: projectIds }, status: { gte: 400 } },
      }),
    ]);

    const errorRate = totalAll > 0 ? Math.round((totalErrors / totalAll) * 10000) / 100 : 0;

    // Top error endpoints
    const topErrorRows: {
      path: string;
      method: string;
      status: number;
      count: bigint;
    }[] = await this.prisma.$queryRawUnsafe(
      `SELECT path, method, status, count(*)::bigint as count
       FROM api_requests
       WHERE "projectId" = ANY($1) AND status >= 400
       GROUP BY path, method, status
       ORDER BY count DESC
       LIMIT 20`,
      projectIds,
    );

    // Errors over time (hourly, last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const buckets = this.generateHourlyBuckets(24);

    const errTimeRows: { hour: Date; count: bigint }[] = await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('hour', timestamp) as hour, count(*)::bigint as count
       FROM api_requests
       WHERE "projectId" = ANY($1) AND status >= 400 AND timestamp >= $2
       GROUP BY hour ORDER BY hour`,
      projectIds,
      since,
    );
    const errTimeMap = new Map(errTimeRows.map((r) => [new Date(r.hour).toISOString(), Number(r.count)]));

    // Errors by status code
    const statusRows: { status: number; count: bigint }[] = await this.prisma.$queryRawUnsafe(
      `SELECT status, count(*)::bigint as count
       FROM api_requests
       WHERE "projectId" = ANY($1) AND status >= 400
       GROUP BY status ORDER BY count DESC`,
      projectIds,
    );

    return {
      success: true,
      status: 200,
      message: 'Error overview retrieved',
      data: {
        totalErrors,
        errorRate,
        topErrors: topErrorRows.map((r, i) => ({
          id: `err-${i}`,
          timestamp: '',
          endpoint: r.path,
          method: r.method,
          statusCode: r.status,
          message: `HTTP ${r.status}`,
          count: Number(r.count),
        })),
        errorsOverTime: buckets.map((b) => ({
          timestamp: b.toISOString(),
          value: errTimeMap.get(b.toISOString()) ?? 0,
        })),
        errorsByStatus: statusRows.map((r) => ({
          statusCode: r.status,
          count: Number(r.count),
        })),
      },
    };

  }

  /** Latency overview */
  async getLatencyOverview(userId: string) {
    const projectIds = await this.getUserProjectIds(userId);
    if (projectIds.length === 0) {
      return {
        success: true,
        status: 200,
        message: 'No latency data found',
        data: {
          avgLatency: 0,
          p50: 0,
          p95: 0,
          p99: 0,
          latencyOverTime: [],
          latencyDistribution: [],
          slowestEndpoints: [],
        },
      };
    }


    // Global percentiles
    const percentiles: { avg: number; p50: number; p95: number; p99: number }[] =
      await this.prisma.$queryRawUnsafe(
        `SELECT avg("latencyMs") as avg,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs") as p50,
                percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") as p95,
                percentile_cont(0.99) WITHIN GROUP (ORDER BY "latencyMs") as p99
         FROM api_requests
         WHERE "projectId" = ANY($1)`,
        projectIds,
      );

    const p = percentiles[0];

    // Latency over time (hourly, last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const buckets = this.generateHourlyBuckets(24);

    const latRows: { hour: Date; avg: number }[] = await this.prisma.$queryRawUnsafe(
      `SELECT date_trunc('hour', timestamp) as hour, avg("latencyMs") as avg
       FROM api_requests
       WHERE "projectId" = ANY($1) AND timestamp >= $2
       GROUP BY hour ORDER BY hour`,
      projectIds,
      since,
    );
    const latMap = new Map(latRows.map((r) => [new Date(r.hour).toISOString(), Math.round(Number(r.avg) * 100) / 100]));

    // Latency distribution (buckets of 50ms)
    const distRows: { bucket: string; count: bigint }[] = await this.prisma.$queryRawUnsafe(
      `SELECT
         CASE
           WHEN "latencyMs" < 50 THEN '0-50ms'
           WHEN "latencyMs" < 100 THEN '50-100ms'
           WHEN "latencyMs" < 200 THEN '100-200ms'
           WHEN "latencyMs" < 500 THEN '200-500ms'
           WHEN "latencyMs" < 1000 THEN '500ms-1s'
           ELSE '1s+'
         END as bucket,
         count(*)::bigint as count
       FROM api_requests
       WHERE "projectId" = ANY($1)
       GROUP BY bucket
       ORDER BY min("latencyMs")`,
      projectIds,
    );

    // Slowest endpoints
    const slowRows: {
      path: string;
      method: string;
      total: bigint;
      errors: bigint;
      avg_latency: number;
      p50: number;
      p95: number;
      p99: number;
    }[] = await this.prisma.$queryRawUnsafe(
      `SELECT path, method,
              count(*)::bigint as total,
              count(*) FILTER (WHERE status >= 400)::bigint as errors,
              avg("latencyMs") as avg_latency,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs") as p50,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") as p95,
              percentile_cont(0.99) WITHIN GROUP (ORDER BY "latencyMs") as p99
       FROM api_requests
       WHERE "projectId" = ANY($1)
       GROUP BY path, method
       ORDER BY avg_latency DESC
       LIMIT 10`,
      projectIds,
    );

    return {
      success: true,
      status: 200,
      message: 'Latency overview retrieved',
      data: {
        avgLatency: Math.round(Number(p?.avg ?? 0) * 100) / 100,
        p50: Math.round(Number(p?.p50 ?? 0) * 100) / 100,
        p95: Math.round(Number(p?.p95 ?? 0) * 100) / 100,
        p99: Math.round(Number(p?.p99 ?? 0) * 100) / 100,
        latencyOverTime: buckets.map((b) => ({
          timestamp: b.toISOString(),
          value: latMap.get(b.toISOString()) ?? 0,
        })),
        latencyDistribution: distRows.map((r) => ({
          bucket: r.bucket,
          count: Number(r.count),
        })),
        slowestEndpoints: slowRows.map((r) => {
          const total = Number(r.total);
          const errors = Number(r.errors);
          return {
            id: `${r.method}:${r.path}`,
            path: r.path,
            method: r.method,
            requests: total,
            avgLatency: Math.round(Number(r.avg_latency) * 100) / 100,
            errors,
            errorRate: total > 0 ? Math.round((errors / total) * 10000) / 100 : 0,
            p50Latency: Math.round(Number(r.p50) * 100) / 100,
            p95Latency: Math.round(Number(r.p95) * 100) / 100,
            p99Latency: Math.round(Number(r.p99) * 100) / 100,
          };
        }),
      },
    };

  }

  /** Generate hourly bucket timestamps going back N hours */
  private generateHourlyBuckets(hours: number): Date[] {
    const buckets: Date[] = [];
    const now = new Date();
    now.setMinutes(0, 0, 0);
    for (let i = hours - 1; i >= 0; i--) {
      buckets.push(new Date(now.getTime() - i * 60 * 60 * 1000));
    }
    return buckets;
  }
}
