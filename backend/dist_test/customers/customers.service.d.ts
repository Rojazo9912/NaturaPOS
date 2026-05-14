import { PrismaService } from '../prisma/prisma.service';
export declare class CustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    searchByPhone(organizationId: string, phone: string): Promise<{
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
    findOne(organizationId: string, id: string): Promise<{
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
    create(organizationId: string, data: any): Promise<{
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
