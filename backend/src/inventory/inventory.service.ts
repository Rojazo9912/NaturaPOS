import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findByBranch(branchId: string) {
    return this.prisma.branchInventory.findMany({
      where: { branchId },
      include: {
        product: { select: { id: true, name: true, isActive: true } },
        ingredient: { select: { id: true, name: true, unit: true } },
      },
    });
  }

  async adjust(branchId: string, userId: string, data: { productId?: string; ingredientId?: string; quantity: number; reason?: string }) {
    if (!data.productId && !data.ingredientId) {
      throw new BadRequestException('Debe especificar producto o ingrediente');
    }

    const whereClause = data.productId
      ? { branchId_productId: { branchId, productId: data.productId } }
      : { branchId_ingredientId: { branchId, ingredientId: data.ingredientId! } };

    const existing = await (this.prisma.branchInventory as any).findUnique({ where: whereClause });

    if (existing) {
      await (this.prisma.branchInventory as any).update({
        where: whereClause,
        data: { quantity: { increment: data.quantity } },
      });
    } else {
      await this.prisma.branchInventory.create({
        data: {
          branchId,
          productId: data.productId,
          ingredientId: data.ingredientId,
          quantity: Math.max(0, data.quantity),
        },
      });
    }

    await this.prisma.inventoryMovement.create({
      data: {
        branchId,
        productId: data.productId,
        ingredientId: data.ingredientId,
        type: data.quantity > 0 ? 'PURCHASE' : 'ADJUSTMENT',
        quantity: Math.abs(data.quantity),
        reason: data.reason ?? 'Ajuste manual',
        userId,
      },
    });

    return { success: true };
  }

  async getLowStock(branchId: string) {
    // Return inventory items where quantity <= minStock
    const all = await this.prisma.branchInventory.findMany({
      where: { branchId },
      include: {
        product: { select: { id: true, name: true } },
        ingredient: { select: { id: true, name: true } },
      },
    });
    return all.filter(item => item.quantity <= item.minStock);
  }

  // ── INGREDIENTS (ORGANIZATION LEVEL) ──
  async getIngredients(organizationId: string) {
    return this.prisma.ingredient.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createIngredient(organizationId: string, data: any) {
    return this.prisma.ingredient.create({
      data: {
        organizationId,
        name: data.name,
        unit: data.unit,
        costPerUnit: data.costPerUnit,
        minStock: data.minStock || 0,
      },
    });
  }

  async updateIngredient(id: string, organizationId: string, data: any) {
    return this.prisma.ingredient.update({
      where: { id, organizationId },
      data: {
        name: data.name,
        unit: data.unit,
        costPerUnit: data.costPerUnit,
        minStock: data.minStock,
      },
    });
  }
}
