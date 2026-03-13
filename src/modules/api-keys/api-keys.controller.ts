import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeysService } from './api-keys.service';

@Controller()
@UseGuards(AuthGuard('jwt')) // Protect all API Keys endpoints
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    @Post('projects/:projectId/api-keys')
    async createApiKey(@Request() req, @Param('projectId') projectId: string, @Body('name') name: string) {
        return this.apiKeysService.createApiKey(req.user.id, projectId, name);
    }

    @Get('projects/:projectId/api-keys')
    async getApiKeys(@Request() req, @Param('projectId') projectId: string) {
        return this.apiKeysService.getApiKeys(req.user.id, projectId);
    }

    @Delete('api-keys/:id')
    async deleteApiKey(@Request() req, @Param('id') id: string) {
        return this.apiKeysService.deleteApiKey(req.user.id, id);
    }
}

