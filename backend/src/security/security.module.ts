import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [SecurityController],
  providers: [SecurityService, EventsGateway],
  exports: [SecurityService, EventsGateway],
})
export class SecurityModule {}
