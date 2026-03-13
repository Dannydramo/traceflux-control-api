import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/project.dto';

@Controller('projects')
@UseGuards(AuthGuard('jwt')) // Protect all endpoints in this controller
export class ProjectsController {
    constructor(private readonly prisma: PrismaService) { }

    @Post()
    async createProject(@Request() req, @Body() dto: CreateProjectDto) {
        const userId = req.user.id;
        return this.prisma.project.create({
            data: {
                name: dto.name,
                userId: userId,
            },
        });
    }

    @Get()
    async getProjects(@Request() req) {
        const userId = req.user.id;
        return this.prisma.project.findMany({
            where: { userId },
            include: {
                apiKeys: true,
            }
        });
    }

    @Delete(':id')
    async deleteProject(@Request() req, @Param('id') id: string) {
        const userId = req.user.id;
        // Prisma's Cascade delete will remove related api_keys
        return this.prisma.project.delete({
            where: {
                id: id,
                userId: userId, // Ensure standard user can only delete their own project
            },
        });
    }
}
