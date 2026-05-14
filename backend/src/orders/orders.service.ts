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

      // Costeo Inteligente: Descontar Inventario
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { recipe: { include: { items: true } } },
        });

        if (product?.recipe) {
          // Descontar insumos basados en la receta
          for (const rItem of product.recipe.items) {
            const qtyToDeduct = rItem.quantity * item.quantity;
            
            // Upsert inventory to deduct
            const currentInv = await tx.branchInventory.findUnique({
              where: { branchId_ingredientId: { branchId: user.branchId, ingredientId: rItem.ingredientId } }
            });
            
            if (currentInv) {
              await tx.branchInventory.update({
                where: { id: currentInv.id },
                data: { quantity: { decrement: qtyToDeduct } },
              });
            } else {
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
        } else {
          // Descontar producto directo (ej. agua embotellada, snacks)
          const currentInv = await tx.branchInventory.findUnique({
            where: { branchId_productId: { branchId: user.branchId, productId: item.productId } }
          });
          
          if (currentInv) {
            await tx.branchInventory.update({
              where: { id: currentInv.id },
              data: { quantity: { decrement: item.quantity } },
            });
          } else {
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

      return order;
    });
  }
}
