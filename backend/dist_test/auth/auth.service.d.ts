import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<{
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
    generateTwoFactorSecret(user: any): Promise<{
        secret: any;
        qrCodeDataURL: string;
    }>;
    verifyTwoFactorCode(code: string, secret: string): Promise<any>;
    login(user: any): Promise<{
        mfaRequired: boolean;
        userId: any;
        access_token?: undefined;
        user?: undefined;
    } | {
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
            organizationId: any;
            branchId: any;
        };
        mfaRequired?: undefined;
        userId?: undefined;
    }>;
    saveMfaSecret(userId: string, secret: string): Promise<{
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
    loginWithMfa(userId: string, code: string): Promise<{
        mfaRequired: boolean;
        userId: any;
        access_token?: undefined;
        user?: undefined;
    } | {
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
            organizationId: any;
            branchId: any;
        };
        mfaRequired?: undefined;
        userId?: undefined;
    }>;
    getProfile(userId: string): Promise<{
        organization: {
            name: string;
            slug: string;
            plan: import(".prisma/client").$Enums.Plan;
        };
        branch: {
            name: string;
            address: string;
        };
        id: string;
        email: string;
        organizationId: string;
        branchId: string;
        name: string;
        phone: string;
        role: import(".prisma/client").$Enums.Role;
        riskScore: number;
        createdAt: Date;
    }>;
}
