import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAllToday(branchId: string) {
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

  async create(user: any, data: any) {
    if (!user.branchId) throw new BadRequestException('Usuario no tiene sucursal asignada');
    
    // Simplificada: crear orden con Prisma Transaction
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
            create: data.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
          payments: {
            create: data.payments?.map((payment: any) => ({
              method: payment.method,
              amount: payment.amount,
            })) || [],
          },
        },
      });

      // Si hay cliente, sumar puntos
      if (data.customerId && data.pointsEarned) {
        await tx.customer.update({
          where: { id: data.customerId },
          data: { points: { increment: data.pointsEarned } },
        });

        await tx.pointsHistory.create({
          data: {
            customerId: data.customerId,
            orderId: order.id,
            type: 'EARNED',
            points: data.pointsEarned,
          },
        });
      }

      return order;
    });
  }
}
