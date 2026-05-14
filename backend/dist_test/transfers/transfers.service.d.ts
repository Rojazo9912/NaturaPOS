import { PrismaService } from '../prisma/prisma.service';
export declare class TransfersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(branchId: string): Promise<({
        items: {
            id: string;
            productId: string | null;
            quantity: number;
            ingredientId: string | null;
            transferId: string;
        }[];
        fromBranch: {
            id: string;
            organizationId: string;
            name: string;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
        };
        toBranch: {
            id: string;
            organizationId: string;
            name: string;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.TransferStatus;
        userId: string;
        fromBranchId: string;
        toBranchId: string;
    })[]>;
    getBranches(organizationId: string, currentBranchId: string): Promise<{
        id: string;
        organizationId: string;
        name: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
    }[]>;
    create(userId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.TransferStatus;
        userId: string;
        fromBranchId: string;
        toBranchId: string;
    }>;
    updateStatus(transferId: string, status: 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED', userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.TransferStatus;
        userId: string;
        fromBranchId: string;
        toBranchId: string;
    }>;
    private adjustInventory;
}
