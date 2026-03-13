import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { SecurityModule } from './modules/security/security.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProjectsModule,
    ApiKeysModule,
    AnalyticsModule,
    TelemetryModule,
    SecurityModule,
  ],
})
export class AppModule { }
