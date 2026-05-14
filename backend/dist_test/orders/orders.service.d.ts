import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../security/events.gateway';
export declare class OrdersService {
    private prisma;
    private eventsGateway;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway);
    findAllToday(branchId: string): Promise<({
        customer: {
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
        };
        items: {
            discount: number;
            id: string;
            costPrice: number;
            productId: string;
            notes: string | null;
            quantity: number;
            subtotal: number;
            unitPrice: number;
            orderId: string;
        }[];
    } & {
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
    })[]>;
    create(user: any, data: any): Promise<{
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
    }>;
}
