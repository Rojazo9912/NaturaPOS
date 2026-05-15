import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../security/events.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

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
          orderNumber: `NP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          branchId: user.branchId,
          cashierId: user.id,
          customerId: data.customerId || null,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount || 0,
          total: data.total,
          pointsEarned: data.pointsEarned || 0,
          pointsRedeemed: data.pointsRedeemed || 0,
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

      // ── Motor de Lealtad (Natural Points & Niveles) ──
      if (data.customerId) {
        // 1. Obtener cliente actual para revisar niveles
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        
        if (customer) {
          const newVisits = customer.totalVisits + 1;
          const newSpent = customer.totalSpent + data.total;
          
          // 2. Lógica de Subida de Nivel Automática
          let newLevel = customer.level;
          if (newVisits >= 50 || newSpent >= 15000) newLevel = 'LEGEND';
          else if (newVisits >= 20 || newSpent >= 5000) newLevel = 'ELITE';
          else if (newVisits >= 5 || newSpent >= 1000) newLevel = 'GOLD';

          // 3. Puntos ganados y redimidos
          const pointsEarned = data.pointsEarned || 0;
          const pointsRedeemed = data.pointsRedeemed || 0;

          // 4. Actualizar cliente
          await tx.customer.update({
            where: { id: data.customerId },
            data: { 
              totalVisits: { increment: 1 },
              totalSpent: { increment: data.total },
              points: { increment: pointsEarned - pointsRedeemed },
              level: newLevel
            },
          });

          // 5. Historial de Puntos
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

      // Costeo Inteligente: Descontar Inventario
      const inventoryWarnings: string[] = [];

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
              where: { branchId_ingredientId: { branchId: user.branchId, ingredientId: rItem.ingredientId } },
              include: { ingredient: true }
            });
            
            if (currentInv) {
              const updatedInv = await tx.branchInventory.update({
                where: { id: currentInv.id },
                data: { quantity: { decrement: qtyToDeduct } },
              });
              if (updatedInv.quantity <= updatedInv.minStock) {
                inventoryWarnings.push(`Stock crítico de insumo: ${currentInv.ingredient?.name} (Queda: ${updatedInv.quantity})`);
              }
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
            where: { branchId_productId: { branchId: user.branchId, productId: item.productId } },
            include: { product: true }
          });
          
          if (currentInv) {
            const updatedInv = await tx.branchInventory.update({
              where: { id: currentInv.id },
              data: { quantity: { decrement: item.quantity } },
            });
            if (updatedInv.quantity <= updatedInv.minStock) {
               inventoryWarnings.push(`Stock crítico de producto: ${currentInv.product?.name} (Queda: ${updatedInv.quantity})`);
            }
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

      // Emit real-time notification
      this.eventsGateway.emitOrder(user.organizationId, order);

      return { ...order, inventoryWarnings };
    });
  }
}
