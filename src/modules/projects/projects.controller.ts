import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/project.dto';

@Controller('projects')
@UseGuards(AuthGuard('jwt')) // Protect all endpoints in this controller
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Post()
    async createProject(@Request() req, @Body() dto: CreateProjectDto) {
        return this.projectsService.createProject(req.user.id, dto);
    }

    @Get()
    async getProjects(@Request() req) {
        return this.projectsService.getProjects(req.user.id);
    }

    @Delete(':id')
    async deleteProject(@Request() req, @Param('id') id: string) {
        return this.projectsService.deleteProject(req.user.id, id);
    }
}

