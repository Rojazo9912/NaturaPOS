import { PrismaService } from '../prisma/prisma.service';
export declare class CashRegisterService {
    private prisma;
    constructor(prisma: PrismaService);
    open(branchId: string, userId: string, openingAmount: number): Promise<{
        id: string;
        branchId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RegisterStatus;
        userId: string;
        openedAt: Date;
        closedAt: Date | null;
        openingAmount: number;
        closingAmount: number | null;
        expectedAmount: number | null;
        difference: number | null;
    }>;
    getActive(branchId: string, userId: string): Promise<{
        id: string;
        branchId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RegisterStatus;
        userId: string;
        openedAt: Date;
        closedAt: Date | null;
        openingAmount: number;
        closingAmount: number | null;
        expectedAmount: number | null;
        difference: number | null;
    }>;
    close(id: string, userId: string, closingAmount: number, notes?: string): Promise<{
        register: {
            id: string;
            branchId: string;
            notes: string | null;
            status: import(".prisma/client").$Enums.RegisterStatus;
            userId: string;
            openedAt: Date;
            closedAt: Date | null;
            openingAmount: number;
            closingAmount: number | null;
            expectedAmount: number | null;
            difference: number | null;
        };
        summary: {
            totalSales: number;
            totalCash: number;
            difference: number;
            ordersCount: number;
        };
    }>;
    getHistory(branchId: string): Promise<({
        user: {
            name: string;
        };
        cuts: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.CutType;
            notes: string | null;
            taxAmount: number;
            cashRegisterId: string;
            totalSales: number;
            totalCash: number;
            totalCard: number;
            totalTransfer: number;
            totalWallet: number;
            totalQR: number;
            totalRefunds: number;
            totalDiscounts: number;
            totalWaste: number;
            grossProfit: number;
            netProfit: number;
            exportedAt: Date | null;
        }[];
    } & {
        id: string;
        branchId: string;
        notes: string | null;
        status: import(".prisma/client").$Enums.RegisterStatus;
        userId: string;
        openedAt: Date;
        closedAt: Date | null;
        openingAmount: number;
        closingAmount: number | null;
        expectedAmount: number | null;
        difference: number | null;
    })[]>;
}
