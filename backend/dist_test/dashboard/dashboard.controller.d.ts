import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(user: any): Promise<{
        salesToday: number;
        salesWeek: number;
        salesMonth: number;
        ordersToday: number;
        avgTicket: number;
        totalCustomers: number;
    }>;
    getTopProducts(user: any): Promise<{
        productId: string;
        name: string;
        totalQty: number;
        totalRevenue: number;
    }[]>;
    getSalesByHour(user: any): Promise<{
        orders: number;
        revenue: number;
        hour: number;
    }[]>;
    getFranchise(user: any): Promise<{
        branchId: string;
        name: string;
        salesToday: number;
        ordersToday: number;
    }[]>;
}
