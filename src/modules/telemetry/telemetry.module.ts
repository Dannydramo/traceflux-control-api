import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryGateway } from './telemetry.gateway';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
    imports: [PrismaModule, AnalyticsModule],
    controllers: [
        TelemetryController,
    ],
    providers: [TelemetryGateway],
})
export class TelemetryModule { }
