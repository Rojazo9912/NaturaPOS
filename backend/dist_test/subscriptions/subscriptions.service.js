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
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SubscriptionsService = class SubscriptionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPlans(organizationId) {
        return this.prisma.subscriptionPlan.findMany({
            where: { organizationId, isActive: true },
        });
    }
    async createPlan(organizationId, data) {
        return this.prisma.subscriptionPlan.create({
            data: {
                organizationId,
                name: data.name,
                description: data.description,
                price: data.price,
                intervalDays: data.intervalDays ?? 30,
                smoothiesQty: data.smoothiesQty,
                discountPct: data.discountPct ?? 0,
            },
        });
    }
    async subscribeCustomer(customerId, planId) {
        const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan)
            throw new Error('Plan not found');
        const nextBilling = new Date();
        nextBilling.setDate(nextBilling.getDate() + plan.intervalDays);
        return this.prisma.customerSubscription.create({
            data: {
                customerId,
                planId,
                nextBilling,
                status: 'ACTIVE',
            },
        });
    }
    async getCustomerSubscriptions(organizationId) {
        return this.prisma.customerSubscription.findMany({
            where: { customer: { organizationId } },
            include: {
                customer: true,
                plan: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map