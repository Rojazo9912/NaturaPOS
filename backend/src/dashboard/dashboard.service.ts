import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(today);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const [todayOrders, weekOrders, monthOrders, totalCustomers, cancelledToday, yesterdayOrders] = await Promise.all([
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
      this.prisma.order.findMany({
        where: { branchId, status: 'CANCELLED', createdAt: { gte: today, lte: endOfDay } },
        include: { cashier: { select: { name: true } } },
      }),
      this.prisma.order.findMany({
        where: { branchId, status: 'COMPLETED', createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      }),
    ]);

    const salesToday = todayOrders.reduce((s, o) => s + o.total, 0);
    const salesWeek  = weekOrders.reduce((s, o) => s + o.total, 0);
    const salesMonth = monthOrders.reduce((s, o) => s + o.total, 0);
    const ordersToday = todayOrders.length;
    const avgTicket   = ordersToday > 0 ? salesToday / ordersToday : 0;

    // Calculate gross profit from cost data in order items
    const totalCost = todayOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => {
        return itemSum + (item.costPrice * item.quantity);
      }, 0);
    }, 0);
    const grossProfitToday = salesToday - totalCost;
    const profitMargin = salesToday > 0 ? (grossProfitToday / salesToday) * 100 : 0;

    // Cancellation summary
    const cancellationsToday = cancelledToday.map(o => ({
      orderNumber: o.orderNumber,
      total: o.total,
      cashierName: (o as any).cashier?.name || 'Desconocido',
      cancelledAt: o.updatedAt,
    }));

    const salesYesterday = yesterdayOrders.reduce((s, o) => s + o.total, 0);
    const ordersYesterday = yesterdayOrders.length;

    return {
      salesToday,
      salesYesterday,
      salesWeek,
      salesMonth,
      ordersToday,
      ordersYesterday,
      avgTicket,
      totalCustomers,
      grossProfitToday,
      profitMargin,
      cancellationsToday,
      cancellationsCount: cancelledToday.length,
      cancellationsTotal: cancelledToday.reduce((s, o) => s + o.total, 0),
    };
  }

  async getTopProducts(branchId: string) {
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

  async getSalesByHour(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { branchId, status: 'COMPLETED', createdAt: { gte: today } },
      select: { createdAt: true, total: true },
    });

    const byHour: Record<number, { orders: number; revenue: number }> = {};
    for (let h = 6; h <= 22; h++) byHour[h] = { orders: 0, revenue: 0 };

    orders.forEach(o => {
      const h = o.createdAt.getHours();
      if (byHour[h]) {
        byHour[h].orders++;
        byHour[h].revenue += o.total;
      }
    });

    return Object.entries(byHour).map(([hour, data]) => ({ hour: Number(hour), ...data }));
  }

  async getFranchiseSummary(organizationId: string) {
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
}
