import { PrismaService } from '../prisma/prisma.service';
export declare class SubscriptionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPlans(organizationId: string): Promise<{
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        description: string | null;
        price: number;
        intervalDays: number;
        smoothiesQty: number | null;
        discountPct: number;
        pointsMultiplier: number;
        benefits: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
    createPlan(organizationId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        description: string | null;
        price: number;
        intervalDays: number;
        smoothiesQty: number | null;
        discountPct: number;
        pointsMultiplier: number;
        benefits: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    subscribeCustomer(customerId: string, planId: string): Promise<{
        id: string;
        createdAt: Date;
        customerId: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        startDate: Date;
        endDate: Date | null;
        nextBilling: Date | null;
        planId: string;
    }>;
    getCustomerSubscriptions(organizationId: string): Promise<({
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
        plan: {
            id: string;
            organizationId: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            description: string | null;
            price: number;
            intervalDays: number;
            smoothiesQty: number | null;
            discountPct: number;
            pointsMultiplier: number;
            benefits: import("@prisma/client/runtime/client").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        customerId: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        startDate: Date;
        endDate: Date | null;
        nextBilling: Date | null;
        planId: string;
    })[]>;
}
