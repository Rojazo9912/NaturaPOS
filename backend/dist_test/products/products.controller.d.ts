import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(user: any): Promise<({
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
    findCategories(user: any): Promise<{
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        sortOrder: number;
        emoji: string | null;
        color: string | null;
    }[]>;
    create(user: any, createProductDto: any): Promise<{
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
    update(id: string, user: any, updateProductDto: any): Promise<{
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
    getRecipe(id: string): Promise<{
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
    upsertRecipe(id: string, dto: any): Promise<{
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
