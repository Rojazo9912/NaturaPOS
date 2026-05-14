import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OWNER') // Solo roles directivos pueden ver auditoría
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('audit-logs')
  getAuditLogs(@CurrentUser() user: any) {
    return this.securityService.getAuditLogs(user.organizationId);
  }

  @Get('risk-alerts')
  getRiskAlerts(@CurrentUser() user: any) {
    return this.securityService.getRiskAlerts(user.organizationId);
  }

  @Post('risk-alerts/:id/resolve')
  resolveRiskAlert(@Param('id') id: string, @CurrentUser() user: any) {
    return this.securityService.resolveRiskAlert(id, user.organizationId);
  }
}
