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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(branchId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        const [todayOrders, weekOrders, monthOrders, totalCustomers] = await Promise.all([
            this.prisma.order.findMany({
                where: { branchId, status: 'COMPLETED', createdAt: { gte: today, lte: endOfDay } },
                include: { items: true },
            }),
            this.prisma.order.findMany({
                where: {
                    branchId, status: 'COMPLETED',
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.order.findMany({
                where: {
                    branchId, status: 'COMPLETED',
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.customer.count({ where: { isActive: true } }),
        ]);
        const salesToday = todayOrders.reduce((s, o) => s + o.total, 0);
        const salesWeek = weekOrders.reduce((s, o) => s + o.total, 0);
        const salesMonth = monthOrders.reduce((s, o) => s + o.total, 0);
        const ordersToday = todayOrders.length;
        const avgTicket = ordersToday > 0 ? salesToday / ordersToday : 0;
        return {
            salesToday,
            salesWeek,
            salesMonth,
            ordersToday,
            avgTicket,
            totalCustomers,
        };
    }
    async getTopProducts(branchId) {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const items = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                order: { branchId, status: 'COMPLETED', createdAt: { gte: since } },
            },
            _sum: { quantity: true, subtotal: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 8,
        });
        const products = await this.prisma.product.findMany({
            where: { id: { in: items.map(i => i.productId) } },
            select: { id: true, name: true },
        });
        return items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                productId: item.productId,
                name: product?.name ?? 'Desconocido',
                totalQty: item._sum.quantity ?? 0,
                totalRevenue: item._sum.subtotal ?? 0,
            };
        });
    }
    async getSalesByHour(branchId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const orders = await this.prisma.order.findMany({
            where: { branchId, status: 'COMPLETED', createdAt: { gte: today } },
            select: { createdAt: true, total: true },
        });
        const byHour = {};
        for (let h = 6; h <= 22; h++)
            byHour[h] = { orders: 0, revenue: 0 };
        orders.forEach(o => {
            const h = o.createdAt.getHours();
            if (byHour[h]) {
                byHour[h].orders++;
                byHour[h].revenue += o.total;
            }
        });
        return Object.entries(byHour).map(([hour, data]) => ({ hour: Number(hour), ...data }));
    }
    async getFranchiseSummary(organizationId) {
        const branches = await this.prisma.branch.findMany({
            where: { organizationId, isActive: true },
            select: { id: true, name: true },
        });
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        const summaries = await Promise.all(branches.map(async (b) => {
            const orders = await this.prisma.order.findMany({
                where: { branchId: b.id, status: 'COMPLETED', createdAt: { gte: since } },
                select: { total: true },
            });
            return {
                branchId: b.id,
                name: b.name,
                salesToday: orders.reduce((s, o) => s + o.total, 0),
                ordersToday: orders.length,
            };
        }));
        return summaries.sort((a, b) => b.salesToday - a.salesToday);
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map