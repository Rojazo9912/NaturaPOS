"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        return this.prisma.product.findMany({
            where: { organizationId, isActive: true },
            include: { category: true },
        });
    }
    async findCategories(organizationId) {
        return this.prisma.category.findMany({
            where: { organizationId, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async create(organizationId, data) {
        return this.prisma.product.create({
            data: {
                ...data,
                organizationId,
            },
        });
    }
    async update(id, organizationId, data) {
        return this.prisma.product.update({
            where: { id, organizationId },
            data,
        });
    }
    async getRecipe(productId) {
        return this.prisma.recipe.findUnique({
            where: { productId },
            include: {
                items: {
                    include: { ingredient: true }
                }
            }
        });
    }
    async upsertRecipe(productId, data) {
        const existingRecipe = await this.prisma.recipe.findUnique({ where: { productId } });
        if (existingRecipe) {
            await this.prisma.recipeItem.deleteMany({ where: { recipeId: existingRecipe.id } });
        }
        return this.prisma.recipe.upsert({
            where: { productId },
            update: {
                yieldQty: data.yieldQty,
                items: {
                    create: data.items.map(item => ({
                        ingredientId: item.ingredientId,
                        quantity: item.quantity,
                        unit: item.unit,
                    }))
                }
            },
            create: {
                productId,
                yieldQty: data.yieldQty,
                items: {
                    create: data.items.map(item => ({
                        ingredientId: item.ingredientId,
                        quantity: item.quantity,
                        unit: item.unit,
                    }))
                }
            },
            include: { items: true }
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map