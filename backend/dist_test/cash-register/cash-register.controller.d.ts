import { CashRegisterService } from './cash-register.service';
export declare class CashRegisterController {
    private readonly cashRegisterService;
    constructor(cashRegisterService: CashRegisterService);
    getActive(user: any): Promise<{
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
    open(user: any, dto: {
        openingAmount: number;
    }): Promise<{
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
    close(id: string, user: any, dto: {
        closingAmount: number;
        notes?: string;
    }): Promise<{
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
    getHistory(user: any): Promise<({
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
