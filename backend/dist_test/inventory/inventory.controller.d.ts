import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    findByBranch(user: any): Promise<({
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
    adjust(user: any, dto: any): Promise<{
        success: boolean;
    }>;
    getIngredients(user: any): Promise<{
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
    createIngredient(user: any, dto: any): Promise<{
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
    updateIngredient(id: string, user: any, dto: any): Promise<{
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
