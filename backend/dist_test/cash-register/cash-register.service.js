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
exports.CashRegisterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CashRegisterService = class CashRegisterService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async open(branchId, userId, openingAmount) {
        const existing = await this.prisma.cashRegister.findFirst({
            where: { branchId, userId, status: 'OPEN' },
        });
        if (existing)
            throw new common_1.BadRequestException('Ya tienes una caja abierta');
        return this.prisma.cashRegister.create({
            data: { branchId, userId, openingAmount, status: 'OPEN' },
        });
    }
    async getActive(branchId, userId) {
        return this.prisma.cashRegister.findFirst({
            where: { branchId, userId, status: 'OPEN' },
        });
    }
    async close(id, userId, closingAmount, notes) {
        const register = await this.prisma.cashRegister.findFirst({
            where: { id, userId, status: 'OPEN' },
        });
        if (!register)
            throw new common_1.NotFoundException('Caja no encontrada o ya cerrada');
        const orders = await this.prisma.order.findMany({
            where: {
                branchId: register.branchId,
                cashierId: userId,
                status: 'COMPLETED',
                createdAt: { gte: register.openedAt },
            },
            include: { payments: true },
        });
        const totalSales = orders.reduce((s, o) => s + o.total, 0);
        const totalCash = orders.flatMap(o => o.payments).filter(p => p.method === 'CASH').reduce((s, p) => s + p.amount, 0);
        const totalCard = orders.flatMap(o => o.payments).filter(p => p.method === 'CARD').reduce((s, p) => s + p.amount, 0);
        const totalTransfer = orders.flatMap(o => o.payments).filter(p => p.method === 'TRANSFER').reduce((s, p) => s + p.amount, 0);
        const totalWallet = orders.flatMap(o => o.payments).filter(p => p.method === 'WALLET').reduce((s, p) => s + p.amount, 0);
        const totalQR = orders.flatMap(o => o.payments).filter(p => p.method === 'QR').reduce((s, p) => s + p.amount, 0);
        const expectedAmount = register.openingAmount + totalCash;
        const difference = closingAmount - expectedAmount;
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.cashRegister.update({
                where: { id },
                data: {
                    closedAt: new Date(),
                    closingAmount,
                    expectedAmount,
                    difference,
                    status: 'CLOSED',
                    notes,
                },
            });
            const cutData = {
                cashRegisterId: id,
                totalSales,
                totalCash,
                totalCard,
                totalTransfer,
                totalWallet,
                totalQR,
                totalRefunds: 0,
                totalDiscounts: orders.reduce((s, o) => s + o.discountAmount, 0),
                totalWaste: 0,
                grossProfit: totalSales,
                netProfit: totalSales,
                taxAmount: 0,
                notes,
            };
            await tx.financialCut.createMany({
                data: [
                    { ...cutData, type: 'ADMIN' },
                    { ...cutData, type: 'FISCAL' },
                ],
            });
            if (difference <= -50) {
                const user = await tx.user.findUnique({ where: { id: userId } });
                await tx.riskAlert.create({
                    data: {
                        organizationId: user.organizationId,
                        branchId: register.branchId,
                        type: 'CASH_SHORTAGE',
                        severity: difference <= -200 ? 'CRITICAL' : 'HIGH',
                        description: `Faltante de caja detectado: $${Math.abs(difference)} al cerrar turno. Cajero: ${user.name}`,
                    }
                });
            }
            return { register: updated, summary: { totalSales, totalCash, difference, ordersCount: orders.length } };
        });
    }
    async getHistory(branchId) {
        return this.prisma.cashRegister.findMany({
            where: { branchId },
            include: { cuts: true, user: { select: { name: true } } },
            orderBy: { openedAt: 'desc' },
            take: 20,
        });
    }
};
exports.CashRegisterService = CashRegisterService;
exports.CashRegisterService = CashRegisterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CashRegisterService);
//# sourceMappingURL=cash-register.service.js.map