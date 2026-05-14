import { PrismaService } from '../prisma/prisma.service';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    findByBranch(branchId: string): Promise<({
        product: {
            id: string;
            name: string;
            isActive: boolean;
        };
        ingredient: {
            id: string;
            name: string;
            unit: import(".prisma/client").$Enums.Unit;
        };
    } & {
        id: string;
        branchId: string;
        updatedAt: Date;
        productId: string | null;
        quantity: number;
        ingredientId: string | null;
        minStock: number;
    })[]>;
    adjust(branchId: string, userId: string, data: {
        productId?: string;
        ingredientId?: string;
        quantity: number;
        reason?: string;
    }): Promise<{
        success: boolean;
    }>;
    getLowStock(branchId: string): Promise<({
        product: {
            id: string;
            name: string;
        };
        ingredient: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        branchId: string;
        updatedAt: Date;
        productId: string | null;
        quantity: number;
        ingredientId: string | null;
        minStock: number;
    })[]>;
    getIngredients(organizationId: string): Promise<{
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        minStock: number;
        costPerUnit: number;
        stock: number;
    }[]>;
    createIngredient(organizationId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        minStock: number;
        costPerUnit: number;
        stock: number;
    }>;
    updateIngredient(id: string, organizationId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string | null;
        unit: import(".prisma/client").$Enums.Unit;
        minStock: number;
        costPerUnit: number;
        stock: number;
    }>;
}
