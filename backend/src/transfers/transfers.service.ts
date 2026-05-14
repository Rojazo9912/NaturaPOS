import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId: string) {
    return this.prisma.inventoryTransfer.findMany({
      where: {
        OR: [
          { fromBranchId: branchId },
          { toBranchId: branchId },
        ],
      },
      include: {
        fromBranch: true,
        toBranch: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBranches(organizationId: string, currentBranchId: string) {
    return this.prisma.branch.findMany({
      where: {
        organizationId,
        id: { not: currentBranchId },
        isActive: true,
      },
    });
  }

  async create(userId: string, data: any) {
    return this.prisma.inventoryTransfer.create({
      data: {
        fromBranchId: data.fromBranchId,
        toBranchId: data.toBranchId,
        userId,
        notes: data.notes,
        items: {
          create: data.items.map((item: any) => ({
            ingredientId: item.ingredientId || null,
            productId: item.productId || null,
            quantity: item.quantity,
          })),
        },
      },
    });
  }

  async updateStatus(transferId: string, status: 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED', userId: string) {
    const transfer = await this.prisma.inventoryTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });

    if (!transfer) throw new BadRequestException('Transferencia no encontrada');
    if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
      throw new BadRequestException('La transferencia ya ha sido finalizada');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Lógica de Inventario según el cambio de estado
      if (status === 'IN_TRANSIT' && transfer.status === 'PENDING') {
        // Descontar de la sucursal origen
        for (const item of transfer.items) {
          await this.adjustInventory(tx, transfer.fromBranchId, item, 'decrement', userId, transfer.id, 'TRANSFER_OUT');
        }
      } else if (status === 'RECEIVED' && (transfer.status === 'IN_TRANSIT' || transfer.status === 'PENDING')) {
        // Si no se marcó como IN_TRANSIT antes, descontar ahora de origen
        if (transfer.status === 'PENDING') {
          for (const item of transfer.items) {
            await this.adjustInventory(tx, transfer.fromBranchId, item, 'decrement', userId, transfer.id, 'TRANSFER_OUT');
          }
        }
        // Sumar a la sucursal destino
        for (const item of transfer.items) {
          await this.adjustInventory(tx, transfer.toBranchId, item, 'increment', userId, transfer.id, 'TRANSFER_IN');
        }
      }

      return tx.inventoryTransfer.update({
        where: { id: transferId },
        data: { status },
      });
    });
  }

  private async adjustInventory(tx: any, branchId: string, item: any, action: 'increment' | 'decrement', userId: string, transferId: string, type: 'TRANSFER_IN' | 'TRANSFER_OUT') {
    const where = item.ingredientId 
      ? { branchId_ingredientId: { branchId, ingredientId: item.ingredientId } }
      : { branchId_productId: { branchId, productId: item.productId } };

    const current = await tx.branchInventory.findUnique({ where });

    if (current) {
      await tx.branchInventory.update({
        where: { id: current.id },
        data: { quantity: { [action]: item.quantity } },
      });
    } else {
      await tx.branchInventory.create({
        data: {
          branchId,
          ingredientId: item.ingredientId,
          productId: item.productId,
          quantity: action === 'increment' ? item.quantity : -item.quantity,
        },
      });
    }

    // Registrar movimiento
    await tx.inventoryMovement.create({
      data: {
        branchId,
        ingredientId: item.ingredientId,
        productId: item.productId,
        type,
        quantity: item.quantity,
        reason: `Transferencia ${transferId}`,
        userId,
      },
    });
  }
}
