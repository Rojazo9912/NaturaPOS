import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans(organizationId: string) {
    return this.prisma.subscriptionPlan.findMany({
      where: { organizationId, isActive: true },
    });
  }

  async createPlan(organizationId: string, data: any) {
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

  async subscribeCustomer(customerId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');

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

  async getCustomerSubscriptions(organizationId: string) {
    return this.prisma.customerSubscription.findMany({
      where: { customer: { organizationId } },
      include: {
        customer: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
