import { CustomersService } from './customers.service';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    search(user: any, phone: string): Promise<{
        level: import(".prisma/client").$Enums.CustomerLevel;
        id: string;
        email: string | null;
        organizationId: string;
        name: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        birthDate: Date | null;
        avatarUrl: string | null;
        totalVisits: number;
        totalSpent: number;
        points: number;
        walletBalance: number;
    }[]>;
    create(user: any, createCustomerDto: any): Promise<{
        level: import(".prisma/client").$Enums.CustomerLevel;
        id: string;
        email: string | null;
        organizationId: string;
        name: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        birthDate: Date | null;
        avatarUrl: string | null;
        totalVisits: number;
        totalSpent: number;
        points: number;
        walletBalance: number;
    }>;
    findOne(user: any, id: string): Promise<{
        orders: {
            id: string;
            branchId: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            cashierId: string;
            customerId: string | null;
            orderNumber: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            subtotal: number;
            discountAmount: number;
            taxAmount: number;
            total: number;
            pointsEarned: number;
            pointsRedeemed: number;
            isOffline: boolean;
        }[];
    } & {
        level: import(".prisma/client").$Enums.CustomerLevel;
        id: string;
        email: string | null;
        organizationId: string;
        name: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        birthDate: Date | null;
        avatarUrl: string | null;
        totalVisits: number;
        totalSpent: number;
        points: number;
        walletBalance: number;
    }>;
}
