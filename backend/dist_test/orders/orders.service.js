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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const events_gateway_1 = require("../security/events.gateway");
let OrdersService = class OrdersService {
    constructor(prisma, eventsGateway) {
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
    }
    async findAllToday(branchId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.prisma.order.findMany({
            where: {
                branchId,
                createdAt: {
                    gte: today,
                },
            },
            include: {
                items: true,
                customer: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(user, data) {
        if (!user.branchId)
            throw new common_1.BadRequestException('Usuario no tiene sucursal asignada');
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    orderNumber: `ORD-${Date.now()}`,
                    branchId: user.branchId,
                    cashierId: user.id,
                    customerId: data.customerId || null,
                    subtotal: data.subtotal,
                    total: data.total,
                    status: 'COMPLETED',
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subtotal: item.subtotal,
                        })),
                    },
                    payments: {
                        create: data.payments?.map((payment) => ({
                            method: payment.method,
                            amount: payment.amount,
                        })) || [],
                    },
                },
            });
            if (data.customerId) {
                const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
                if (customer) {
                    const newVisits = customer.totalVisits + 1;
                    const newSpent = customer.totalSpent + data.total;
                    let newLevel = customer.level;
                    if (newVisits >= 50 || newSpent >= 15000)
                        newLevel = 'LEGEND';
                    else if (newVisits >= 20 || newSpent >= 5000)
                        newLevel = 'ELITE';
                    else if (newVisits >= 5 || newSpent >= 1000)
                        newLevel = 'GOLD';
                    const pointsEarned = data.pointsEarned || 0;
                    const pointsRedeemed = data.pointsRedeemed || 0;
                    await tx.customer.update({
                        where: { id: data.customerId },
                        data: {
                            totalVisits: { increment: 1 },
                            totalSpent: { increment: data.total },
                            points: { increment: pointsEarned - pointsRedeemed },
                            level: newLevel
                        },
                    });
                    if (pointsEarned > 0) {
                        await tx.pointsHistory.create({
                            data: { customerId: data.customerId, orderId: order.id, type: 'EARNED', points: pointsEarned },
                        });
                    }
                    if (pointsRedeemed > 0) {
                        await tx.pointsHistory.create({
                            data: { customerId: data.customerId, orderId: order.id, type: 'REDEEMED', points: pointsRedeemed },
                        });
                    }
                }
            }
            for (const item of data.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    include: { recipe: { include: { items: true } } },
                });
                if (product?.recipe) {
                    for (const rItem of product.recipe.items) {
                        const qtyToDeduct = rItem.quantity * item.quantity;
                        const currentInv = await tx.branchInventory.findUnique({
                            where: { branchId_ingredientId: { branchId: user.branchId, ingredientId: rItem.ingredientId } }
                        });
                        if (currentInv) {
                            await tx.branchInventory.update({
                                where: { id: currentInv.id },
                                data: { quantity: { decrement: qtyToDeduct } },
                            });
                        }
                        else {
                            await tx.branchInventory.create({
                                data: { branchId: user.branchId, ingredientId: rItem.ingredientId, quantity: -qtyToDeduct },
                            });
                        }
                        await tx.inventoryMovement.create({
                            data: {
                                branchId: user.branchId,
                                ingredientId: rItem.ingredientId,
                                type: 'SALE',
                                quantity: qtyToDeduct,
                                reason: `Venta orden ${order.orderNumber}`,
                                userId: user.id,
                                orderId: order.id,
                            },
                        });
                    }
                }
                else {
                    const currentInv = await tx.branchInventory.findUnique({
                        where: { branchId_productId: { branchId: user.branchId, productId: item.productId } }
                    });
                    if (currentInv) {
                        await tx.branchInventory.update({
                            where: { id: currentInv.id },
                            data: { quantity: { decrement: item.quantity } },
                        });
                    }
                    else {
                        await tx.branchInventory.create({
                            data: { branchId: user.branchId, productId: item.productId, quantity: -item.quantity },
                        });
                    }
                    await tx.inventoryMovement.create({
                        data: {
                            branchId: user.branchId,
                            productId: item.productId,
                            type: 'SALE',
                            quantity: item.quantity,
                            reason: `Venta orden ${order.orderNumber}`,
                            userId: user.id,
                            orderId: order.id,
                        },
                    });
                }
            }
            this.eventsGateway.emitOrder(user.organizationId, order);
            return order;
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway])
], OrdersService);
//# sourceMappingURL=orders.service.js.map