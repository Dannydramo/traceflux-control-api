import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SecurityService {
    constructor(private prisma: PrismaService) { }

    private async getUserProjectIds(userId: string): Promise<string[]> {
        const projects = await this.prisma.project.findMany({
            where: { userId },
            select: { id: true },
        });
        return projects.map((p) => p.id);
    }

    async getReportByRequest(userId: string, requestId: string) {
        const projectIds = await this.getUserProjectIds(userId);
        const report = await this.prisma.securityReport.findFirst({
            where: { 
                projectId: { in: projectIds },
                requestId 
            },
        });


        if (!report) {
            throw new NotFoundException(`Security report for request ${requestId} not found`);
        }

        return {
            success: true,
            status: 200,
            message: 'Security report retrieved',
            data: report,
        };
    }


    async getAggregateByEndpoint(userId: string, endpointId?: string) {
        const projectIds = await this.getUserProjectIds(userId);
        if (projectIds.length === 0) {
            return {
                success: true,
                status: 200,
                message: 'No projects found',
                data: null,
            };
        }

        // Find all reports for the endpoint/project
        const where: any = { projectId: { in: projectIds } };
        if (endpointId) {
            where.endpointId = endpointId;
        }

        const reports = await this.prisma.securityReport.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });


        if (reports.length === 0) {
            return {
                success: true,
                status: 200,
                message: 'No security reports found',
                data: {
                    securityScore: 100,
                    riskLevel: 'low',
                    topIssues: [],
                    recommendations: [],
                    totalAnalyzed: 0,
                },
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
            success: true,
            status: 200,
            message: 'Security aggregate retrieved',
            data: {
                securityScore: avgScore,
                riskLevel,
                topIssues,
                recommendations,
                totalAnalyzed: reports.length,
            },
        };
    }


    async getProjectSummary(userId: string) {
        return this.getAggregateByEndpoint(userId); 
    }
}

