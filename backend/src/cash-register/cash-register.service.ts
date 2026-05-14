import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashRegisterService {
  constructor(private prisma: PrismaService) {}

  async open(branchId: string, userId: string, openingAmount: number) {
    const existing = await this.prisma.cashRegister.findFirst({
      where: { branchId, userId, status: 'OPEN' },
    });
    if (existing) throw new BadRequestException('Ya tienes una caja abierta');

    return this.prisma.cashRegister.create({
      data: { branchId, userId, openingAmount, status: 'OPEN' },
    });
  }

  async getActive(branchId: string, userId: string) {
    return this.prisma.cashRegister.findFirst({
      where: { branchId, userId, status: 'OPEN' },
    });
  }

  async close(id: string, userId: string, closingAmount: number, notes?: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { id, userId, status: 'OPEN' },
    });
    if (!register) throw new NotFoundException('Caja no encontrada o ya cerrada');

    // Calcular ventas del turno
    const orders = await this.prisma.order.findMany({
      where: {
        branchId: register.branchId,
        cashierId: userId,
        status: 'COMPLETED',
        createdAt: { gte: register.openedAt },
      },
      include: { payments: true },
    });

    const totalSales     = orders.reduce((s, o) => s + o.total, 0);
    const totalCash      = orders.flatMap(o => o.payments).filter(p => p.method === 'CASH').reduce((s, p) => s + p.amount, 0);
    const totalCard      = orders.flatMap(o => o.payments).filter(p => p.method === 'CARD').reduce((s, p) => s + p.amount, 0);
    const totalTransfer  = orders.flatMap(o => o.payments).filter(p => p.method === 'TRANSFER').reduce((s, p) => s + p.amount, 0);
    const totalWallet    = orders.flatMap(o => o.payments).filter(p => p.method === 'WALLET').reduce((s, p) => s + p.amount, 0);
    const totalQR        = orders.flatMap(o => o.payments).filter(p => p.method === 'QR').reduce((s, p) => s + p.amount, 0);
    const expectedAmount = register.openingAmount + totalCash;
    const difference     = closingAmount - expectedAmount;

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

      // Crear corte A y B
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

      // ── Motor Antifugas (Security & Risk) ──
      // Si hay un faltante mayor a $50, crear alerta de riesgo
      if (difference <= -50) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        await tx.riskAlert.create({
          data: {
            organizationId: user!.organizationId,
            branchId: register.branchId,
            type: 'CASH_SHORTAGE',
            severity: difference <= -200 ? 'CRITICAL' : 'HIGH',
            description: `Faltante de caja detectado: $${Math.abs(difference)} al cerrar turno. Cajero: ${user!.name}`,
          }
        });
      }

      return { register: updated, summary: { totalSales, totalCash, difference, ordersCount: orders.length } };
    });
  }

  async getHistory(branchId: string) {
    return this.prisma.cashRegister.findMany({
      where: { branchId },
      include: { cuts: true, user: { select: { name: true } } },
      orderBy: { openedAt: 'desc' },
      take: 20,
    });
  }
}
