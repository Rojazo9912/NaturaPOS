import { SecurityService } from './security.service';
export declare class SecurityController {
    private readonly securityService;
    constructor(securityService: SecurityService);
    getAuditLogs(user: any): Promise<({
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
    getRiskAlerts(user: any): Promise<({
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
    resolveRiskAlert(id: string, user: any): Promise<{
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
