import { TransfersService } from './transfers.service';
export declare class TransfersController {
    private readonly transfersService;
    constructor(transfersService: TransfersService);
    findAll(user: any): Promise<({
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
    getBranches(user: any): Promise<{
        id: string;
        organizationId: string;
        name: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
    }[]>;
    create(user: any, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.TransferStatus;
        userId: string;
        fromBranchId: string;
        toBranchId: string;
    }>;
    updateStatus(id: string, status: 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED', user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.TransferStatus;
        userId: string;
        fromBranchId: string;
        toBranchId: string;
    }>;
}
