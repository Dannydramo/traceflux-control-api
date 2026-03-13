import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma/prisma.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class TelemetryGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private redisSubscriber: Redis;

    constructor(private prisma: PrismaService) {
        this.redisSubscriber = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
        });
    }

    afterInit(server: Server) {
        console.log('[TelemetryGateway] Init');
        this.redisSubscriber.subscribe('realtime:requests', 'realtime:errors', 'realtime:slow-endpoints');

        this.redisSubscriber.on('message', (channel, message) => {
            try {
                const data = JSON.parse(message);
                // Broadcast to rooms matching the projectId
                if (data.projectId) {
                    this.server.to(`project_${data.projectId}`).emit(channel, data);
                }
            } catch (err) {
                console.error('[TelemetryGateway] Error parsing redis message', err);
            }
        });
    }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth?.token || client.handshake.query?.token;
            if (!token) throw new Error('No token provided');

            const decoded: any = jwt.verify(token as string, process.env.JWT_SECRET || 'super-secret-key');

            // Join all projects the user owns
            const projects = await this.prisma.project.findMany({ where: { userId: decoded.id } });
            projects.forEach(p => client.join(`project_${p.id}`));

        } catch (error) {
            console.error('[TelemetryGateway] Connection rejected', error.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        // Automatically handled by socket.io
    }
}
