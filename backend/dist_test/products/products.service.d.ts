import { PrismaService } from '../prisma/prisma.service';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<({
        category: {
            id: string;
            organizationId: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            sortOrder: number;
            emoji: string | null;
            color: string | null;
        };
    } & {
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string | null;
        description: string | null;
        imageUrl: string | null;
        price: number;
        costPrice: number;
        type: import(".prisma/client").$Enums.ProductType;
        isFavorite: boolean;
        barcode: string | null;
        sku: string | null;
        sortOrder: number;
    })[]>;
    findCategories(organizationId: string): Promise<{
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        sortOrder: number;
        emoji: string | null;
        color: string | null;
    }[]>;
    create(organizationId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string | null;
        description: string | null;
        imageUrl: string | null;
        price: number;
        costPrice: number;
        type: import(".prisma/client").$Enums.ProductType;
        isFavorite: boolean;
        barcode: string | null;
        sku: string | null;
        sortOrder: number;
    }>;
    update(id: string, organizationId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string | null;
        description: string | null;
        imageUrl: string | null;
        price: number;
        costPrice: number;
        type: import(".prisma/client").$Enums.ProductType;
        isFavorite: boolean;
        barcode: string | null;
        sku: string | null;
        sortOrder: number;
    }>;
    getRecipe(productId: string): Promise<{
        items: ({
            ingredient: {
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
            };
        } & {
            id: string;
            notes: string | null;
            quantity: number;
            unit: import(".prisma/client").$Enums.Unit;
            costAtTime: number;
            ingredientId: string;
            recipeId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        notes: string | null;
        yieldQty: number;
        totalCost: number;
    }>;
    upsertRecipe(productId: string, data: {
        yieldQty: number;
        items: {
            ingredientId: string;
            quantity: number;
            unit: string;
        }[];
    }): Promise<{
        items: {
            id: string;
            notes: string | null;
            quantity: number;
            unit: import(".prisma/client").$Enums.Unit;
            costAtTime: number;
            ingredientId: string;
            recipeId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        notes: string | null;
        yieldQty: number;
        totalCost: number;
    }>;
}
