import { PrismaService } from '../prisma/prisma.service';
import { RiskType, Severity } from '@prisma/client';
import { EventsGateway } from './events.gateway';
export declare class SecurityService {
    private prisma;
    private eventsGateway;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway);
    createAlert(data: {
        organizationId: string;
        branchId?: string;
        userId?: string;
        type: RiskType;
        severity: Severity;
        description: string;
    }): Promise<{
        id: string;
        organizationId: string;
        branchId: string | null;
        createdAt: Date;
        description: string;
        type: import(".prisma/client").$Enums.RiskType;
        userId: string | null;
        severity: import(".prisma/client").$Enums.Severity;
        isResolved: boolean;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }>;
    getAuditLogs(organizationId: string): Promise<({
        user: {
            name: string;
            role: import(".prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        organizationId: string;
        branchId: string | null;
        createdAt: Date;
        userId: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        oldValue: import("@prisma/client/runtime/client").JsonValue | null;
        newValue: import("@prisma/client/runtime/client").JsonValue | null;
        details: import("@prisma/client/runtime/client").JsonValue | null;
        ip: string | null;
        device: string | null;
    })[]>;
    getRiskAlerts(organizationId: string): Promise<({
        branch: {
            name: string;
        };
    } & {
        id: string;
        organizationId: string;
        branchId: string | null;
        createdAt: Date;
        description: string;
        type: import(".prisma/client").$Enums.RiskType;
        userId: string | null;
        severity: import(".prisma/client").$Enums.Severity;
        isResolved: boolean;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    })[]>;
    resolveRiskAlert(id: string, organizationId: string): Promise<{
        id: string;
        organizationId: string;
        branchId: string | null;
        createdAt: Date;
        description: string;
        type: import(".prisma/client").$Enums.RiskType;
        userId: string | null;
        severity: import(".prisma/client").$Enums.Severity;
        isResolved: boolean;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }>;
}
