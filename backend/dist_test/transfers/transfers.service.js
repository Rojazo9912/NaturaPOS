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
exports.TransfersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TransfersService = class TransfersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(branchId) {
        return this.prisma.inventoryTransfer.findMany({
            where: {
                OR: [
                    { fromBranchId: branchId },
                    { toBranchId: branchId },
                ],
            },
            include: {
                fromBranch: true,
                toBranch: true,
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getBranches(organizationId, currentBranchId) {
        return this.prisma.branch.findMany({
            where: {
                organizationId,
                id: { not: currentBranchId },
                isActive: true,
            },
        });
    }
    async create(userId, data) {
        return this.prisma.inventoryTransfer.create({
            data: {
                fromBranchId: data.fromBranchId,
                toBranchId: data.toBranchId,
                userId,
                notes: data.notes,
                items: {
                    create: data.items.map((item) => ({
                        ingredientId: item.ingredientId || null,
                        productId: item.productId || null,
                        quantity: item.quantity,
                    })),
                },
            },
        });
    }
    async updateStatus(transferId, status, userId) {
        const transfer = await this.prisma.inventoryTransfer.findUnique({
            where: { id: transferId },
            include: { items: true },
        });
        if (!transfer)
            throw new common_1.BadRequestException('Transferencia no encontrada');
        if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
            throw new common_1.BadRequestException('La transferencia ya ha sido finalizada');
        }
        return this.prisma.$transaction(async (tx) => {
            if (status === 'IN_TRANSIT' && transfer.status === 'PENDING') {
                for (const item of transfer.items) {
                    await this.adjustInventory(tx, transfer.fromBranchId, item, 'decrement', userId, transfer.id, 'TRANSFER_OUT');
                }
            }
            else if (status === 'RECEIVED' && (transfer.status === 'IN_TRANSIT' || transfer.status === 'PENDING')) {
                if (transfer.status === 'PENDING') {
                    for (const item of transfer.items) {
                        await this.adjustInventory(tx, transfer.fromBranchId, item, 'decrement', userId, transfer.id, 'TRANSFER_OUT');
                    }
                }
                for (const item of transfer.items) {
                    await this.adjustInventory(tx, transfer.toBranchId, item, 'increment', userId, transfer.id, 'TRANSFER_IN');
                }
            }
            return tx.inventoryTransfer.update({
                where: { id: transferId },
                data: { status },
            });
        });
    }
    async adjustInventory(tx, branchId, item, action, userId, transferId, type) {
        const where = item.ingredientId
            ? { branchId_ingredientId: { branchId, ingredientId: item.ingredientId } }
            : { branchId_productId: { branchId, productId: item.productId } };
        const current = await tx.branchInventory.findUnique({ where });
        if (current) {
            await tx.branchInventory.update({
                where: { id: current.id },
                data: { quantity: { [action]: item.quantity } },
            });
        }
        else {
            await tx.branchInventory.create({
                data: {
                    branchId,
                    ingredientId: item.ingredientId,
                    productId: item.productId,
                    quantity: action === 'increment' ? item.quantity : -item.quantity,
                },
            });
        }
        await tx.inventoryMovement.create({
            data: {
                branchId,
                ingredientId: item.ingredientId,
                productId: item.productId,
                type,
                quantity: item.quantity,
                reason: `Transferencia ${transferId}`,
                userId,
            },
        });
    }
};
exports.TransfersService = TransfersService;
exports.TransfersService = TransfersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransfersService);
//# sourceMappingURL=transfers.service.js.map