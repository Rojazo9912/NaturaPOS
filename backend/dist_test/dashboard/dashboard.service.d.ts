import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getSummary(branchId: string): Promise<{
        salesToday: number;
        salesWeek: number;
        salesMonth: number;
        ordersToday: number;
        avgTicket: number;
        totalCustomers: number;
    }>;
    getTopProducts(branchId: string): Promise<{
        productId: string;
        name: string;
        totalQty: number;
        totalRevenue: number;
    }[]>;
    getSalesByHour(branchId: string): Promise<{
        orders: number;
        revenue: number;
        hour: number;
    }[]>;
    getFranchiseSummary(organizationId: string): Promise<{
        branchId: string;
        name: string;
        salesToday: number;
        ordersToday: number;
    }[]>;
}
