import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    organizationId: string;
    branchId: string | null;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        organization: {
            name: string;
            plan: import(".prisma/client").$Enums.Plan;
        };
        branch: {
            name: string;
        };
    } & {
        id: string;
        email: string;
        organizationId: string;
        branchId: string | null;
        passwordHash: string;
        name: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        mfaEnabled: boolean;
        mfaSecret: string | null;
        riskScore: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
