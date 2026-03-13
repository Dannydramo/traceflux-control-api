import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService) { }

    async createProject(userId: string, dto: CreateProjectDto) {
        const project = await this.prisma.project.create({
            data: {
                name: dto.name,
                userId: userId,
            },
        });
        return {
            success: true,
            status: 201,
            message: 'Project created successfully',
            data: project,
        };
    }

    async getProjects(userId: string) {
        const projects = await this.prisma.project.findMany({
            where: { userId },
            include: {
                apiKeys: true,
            }
        });
        return {
            success: true,
            status: 200,
            message: 'Projects retrieved successfully',
            data: projects,
        };
    }

    async deleteProject(userId: string, id: string) {
        const project = await this.prisma.project.delete({
            where: {
                id: id,
                userId: userId,
            },
        });
        return {
            success: true,
            status: 200,
            message: 'Project deleted successfully',
            data: project,
        };
    }
}
