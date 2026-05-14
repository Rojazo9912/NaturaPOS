import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(organizationId: string, dto: any): Promise<{
        id: string;
        email: string;
        branchId: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    findAll(organizationId: string): Promise<({
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
    })[]>;
    update(id: string, organizationId: string, dto: any): Promise<{
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
    remove(id: string, organizationId: string): Promise<{
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
    getBranches(organizationId: string): Promise<{
        id: string;
        name: string;
    }[]>;
}
