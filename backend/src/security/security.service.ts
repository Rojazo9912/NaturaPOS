import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskType, Severity } from '@prisma/client';
import { EventsGateway } from './events.gateway';

@Injectable()
export class SecurityService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async createAlert(data: {
    organizationId: string;
    branchId?: string;
    userId?: string;
    type: RiskType;
    severity: Severity;
    description: string;
  }) {
    const alert = await this.prisma.riskAlert.create({ data });
    
    // Emit real-time notification
    this.eventsGateway.emitAlert(data.organizationId, alert);
    
    return alert;
  }

  async getAuditLogs(organizationId: string) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      include: {
        user: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getRiskAlerts(organizationId: string) {
    return this.prisma.riskAlert.findMany({
      where: { organizationId },
      include: {
        branch: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async resolveRiskAlert(id: string, organizationId: string) {
    return this.prisma.riskAlert.update({
      where: { id, organizationId },
      data: { isResolved: true }
    });
  }
}
