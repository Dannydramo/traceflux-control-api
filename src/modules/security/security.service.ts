import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SecurityService {
    constructor(private prisma: PrismaService) { }

    async getReportByRequest(projectId: string, requestId: string) {
        const report = await this.prisma.securityReport.findFirst({
            where: { projectId, requestId },
        });

        if (!report) {
            throw new NotFoundException(`Security report for request ${requestId} not found`);
        }

        return report;
    }

    async getAggregateByEndpoint(projectId: string, endpointId: string) {
        // Find all reports for the endpoint
        const reports = await this.prisma.securityReport.findMany({
            where: { projectId, endpointId },
            orderBy: { createdAt: 'desc' },
            take: 100, // Look at the most recent 100 for aggregation
        });

        if (reports.length === 0) {
            return {
                securityScore: 100,
                riskLevel: 'low',
                topIssues: [],
                recommendations: [],
                totalAnalyzed: 0
            };
        }

        // Calculate average score
        const totalScore = reports.reduce((acc, r) => acc + r.securityScore, 0);
        const avgScore = Math.floor(totalScore / reports.length);

        // Determine aggregate risk level
        let riskLevel = 'low';
        if (avgScore < 50) riskLevel = 'critical';
        else if (avgScore < 70) riskLevel = 'high';
        else if (avgScore < 90) riskLevel = 'medium';

        // Collect all issues and count frequencies
        const issuesCount: Record<string, any> = {};
        reports.forEach(r => {
            const issues = r.issues as any[];
            if (Array.isArray(issues)) {
                issues.forEach(issue => {
                    const key = `${issue.type}-${issue.severity}`;
                    if (!issuesCount[key]) {
                        issuesCount[key] = { ...issue, count: 0 };
                    }
                    issuesCount[key].count++;
                });
            }
        });

        const topIssues = Object.values(issuesCount).sort((a, b) => b.count - a.count).slice(0, 5);

        // Collect recommendations from top issues
        const recommendations = [...new Set(topIssues.map(i => i.recommendation))];

        return {
            securityScore: avgScore,
            riskLevel,
            topIssues,
            recommendations,
            totalAnalyzed: reports.length
        };
    }

    async getProjectSummary(projectId: string) {
        return this.getAggregateByEndpoint(projectId, undefined); // Provide undefined to aggregate across the whole project
    }
}
