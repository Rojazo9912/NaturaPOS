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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByBranch(branchId) {
        return this.prisma.branchInventory.findMany({
            where: { branchId },
            include: {
                product: { select: { id: true, name: true, isActive: true } },
                ingredient: { select: { id: true, name: true, unit: true } },
            },
        });
    }
    async adjust(branchId, userId, data) {
        if (!data.productId && !data.ingredientId) {
            throw new common_1.BadRequestException('Debe especificar producto o ingrediente');
        }
        const whereClause = data.productId
            ? { branchId_productId: { branchId, productId: data.productId } }
            : { branchId_ingredientId: { branchId, ingredientId: data.ingredientId } };
        const existing = await this.prisma.branchInventory.findUnique({ where: whereClause });
        if (existing) {
            await this.prisma.branchInventory.update({
                where: whereClause,
                data: { quantity: { increment: data.quantity } },
            });
        }
        else {
            await this.prisma.branchInventory.create({
                data: {
                    branchId,
                    productId: data.productId,
                    ingredientId: data.ingredientId,
                    quantity: Math.max(0, data.quantity),
                },
            });
        }
        await this.prisma.inventoryMovement.create({
            data: {
                branchId,
                productId: data.productId,
                ingredientId: data.ingredientId,
                type: data.quantity > 0 ? 'PURCHASE' : 'ADJUSTMENT',
                quantity: Math.abs(data.quantity),
                reason: data.reason ?? 'Ajuste manual',
                userId,
            },
        });
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            await this.prisma.auditLog.create({
                data: {
                    organizationId: user.organizationId,
                    userId,
                    action: 'INVENTORY_ADJUSTMENT',
                    entity: 'Inventory',
                    details: { ...data, branchId },
                }
            });
            if (data.quantity < -5) {
                await this.prisma.riskAlert.create({
                    data: {
                        organizationId: user.organizationId,
                        branchId,
                        type: 'INVENTORY_MISMATCH',
                        severity: data.quantity <= -20 ? 'HIGH' : 'MEDIUM',
                        description: `Ajuste negativo inusual detectado: ${data.quantity} unidades por ${user.name}. Motivo: ${data.reason || 'N/A'}`,
                    }
                });
            }
        }
        return { success: true };
    }
    async getLowStock(branchId) {
        const all = await this.prisma.branchInventory.findMany({
            where: { branchId },
            include: {
                product: { select: { id: true, name: true } },
                ingredient: { select: { id: true, name: true } },
            },
        });
        return all.filter(item => item.quantity <= item.minStock);
    }
    async getIngredients(organizationId) {
        return this.prisma.ingredient.findMany({
            where: { organizationId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async createIngredient(organizationId, data) {
        return this.prisma.ingredient.create({
            data: {
                organizationId,
                name: data.name,
                unit: data.unit,
                costPerUnit: data.costPerUnit,
                minStock: data.minStock || 0,
            },
        });
    }
    async updateIngredient(id, organizationId, data) {
        return this.prisma.ingredient.update({
            where: { id, organizationId },
            data: {
                name: data.name,
                unit: data.unit,
                costPerUnit: data.costPerUnit,
                minStock: data.minStock,
            },
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map