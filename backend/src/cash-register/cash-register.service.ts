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
      include: { payments: true, items: true },
    });

    const totalSales     = orders.reduce((s, o) => s + o.total, 0);
    const totalDiscounts = orders.reduce((s, o) => s + (o.discountAmount || 0), 0);
    
    // Calcular costo de productos vendidos (COGS)
    const totalCost = orders.reduce((sum, o) => {
      return sum + o.items.reduce((itemSum, item) => itemSum + (item.costPrice * item.quantity), 0);
    }, 0);

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

      // Crear corte A (Administrativo/Real - Verdad absoluta del negocio)
      const cutDataAdmin = {
        cashRegisterId: id,
        totalSales,
        totalCash,
        totalCard,
        totalTransfer,
        totalWallet,
        totalQR,
        totalRefunds: 0,
        totalDiscounts,
        totalWaste: 0,
        grossProfit: totalSales - totalCost,
        netProfit: totalSales - totalCost,
        taxAmount: orders.reduce((s, o) => s + (o.taxAmount || 0), 0),
        notes,
        type: 'ADMIN' as const,
      };

      // Crear corte B (Fiscal/Contable - Filtra pagos rastreables)
      const fiscalSales = totalCard + totalTransfer + totalQR;
      const cutDataFiscal = {
        cashRegisterId: id,
        totalSales: fiscalSales,
        totalCash: 0, // El efectivo no facturado no deja rastro fiscal bancario directo
        totalCard,
        totalTransfer,
        totalWallet: 0, // Wallet interna no fiscal
        totalQR,
        totalRefunds: 0,
        totalDiscounts: 0, // Los descuentos son de operación interna
        totalWaste: 0,
        grossProfit: fiscalSales - (totalCost * (fiscalSales / (totalSales || 1))),
        netProfit: fiscalSales - (totalCost * (fiscalSales / (totalSales || 1))),
        taxAmount: orders.reduce((s, o) => s + (o.taxAmount || 0), 0),
        notes: notes ? `Fiscal - ${notes}` : 'Corte Fiscal de Turno',
        type: 'FISCAL' as const,
      };

      await tx.financialCut.createMany({
        data: [
          cutDataAdmin,
          cutDataFiscal,
        ],
      });

      // ── Motor Antifugas (Security & Risk) ──
      // Si hay un faltante mayor a $50, crear alerta de riesgo
      const user = await tx.user.findUnique({ where: { id: userId } });
      const branch = await tx.branch.findUnique({ where: { id: register.branchId } });
      
      if (difference <= -50) {
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

      // Enviar correo de cierre
      this.sendClosureEmail({
        adminEmail: process.env.ADMIN_EMAIL || 'admin@naturalos.com',
        cashierName: user?.name,
        branchName: branch?.name,
        totalSales,
        difference,
        cutData
      }).catch(err => console.error('Error enviando email de cierre:', err));

      return { register: updated, summary: { totalSales, totalCash, difference, ordersCount: orders.length } };
    });
  }

  private async sendClosureEmail(data: any) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY no configurada. Saltando envío de email.');
      return;
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h1 style="color: #166534; text-align: center;">Cierre de Caja - ${data.branchName || 'Sucursal'}</h1>
        <p><strong>Cajero:</strong> ${data.cashierName}</p>
        <p><strong>Ventas Totales (Bruto):</strong> $${data.totalSales.toFixed(2)}</p>
        <p><strong>Diferencia Físico vs Sistema:</strong> <span style="color: ${data.difference < 0 ? '#ef4444' : '#22c55e'}; font-weight: bold;">$${data.difference.toFixed(2)}</span></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <h2 style="font-size: 18px; color: #374151;">Detalle del Corte:</h2>
        <ul>
          <li>Efectivo: $${data.cutData.totalCash.toFixed(2)}</li>
          <li>Tarjeta: $${data.cutData.totalCard.toFixed(2)}</li>
          <li>Transferencia: $${data.cutData.totalTransfer.toFixed(2)}</li>
          <li>Wallet/Puntos: $${data.cutData.totalWallet.toFixed(2)}</li>
          <li>Descuentos: $${data.cutData.totalDiscounts.toFixed(2)}</li>
        </ul>
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280;">
          <p>Enviado automáticamente por Natural OS 🌿</p>
        </div>
      </div>
    `;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Natural OS <onboarding@resend.dev>', // Resend test domain
          to: data.adminEmail,
          subject: `Corte de Caja - ${data.branchName || 'Sucursal'} - ${new Date().toLocaleDateString()}`,
          html: html
        })
      });
      if (!res.ok) {
        console.error('Failed to send Resend email:', await res.text());
      } else {
        console.log('Email de cierre enviado a', data.adminEmail);
      }
    } catch (e) {
      console.error('Error fetching Resend API:', e);
    }
  }

  async getHistory(branchId: string) {
    return this.prisma.cashRegister.findMany({
      where: { branchId },
      include: { cuts: true, user: { select: { name: true } } },
      orderBy: { openedAt: 'desc' },
      take: 20,
    });
  }

  async getBreakdown(id: string) {
    const register = await this.prisma.cashRegister.findUnique({ where: { id } });
    if (!register) throw new NotFoundException('Caja no encontrada');
    
    const orders = await this.prisma.order.findMany({
      where: {
        branchId: register.branchId,
        cashierId: register.userId,
        status: 'COMPLETED',
        createdAt: {
          gte: register.openedAt,
          lte: register.closedAt || new Date(),
        }
      },
      include: { items: { include: { product: true } } }
    });

    const breakdown: Record<string, { name: string, qty: number, subtotal: number }> = {};
    
    for (const o of orders) {
      for (const item of o.items) {
        if (!breakdown[item.productId]) {
          breakdown[item.productId] = { name: item.product.name, qty: 0, subtotal: 0 };
        }
        breakdown[item.productId].qty += item.quantity;
        breakdown[item.productId].subtotal += item.subtotal;
      }
    }
    
    return Object.values(breakdown).sort((a,b) => b.subtotal - a.subtotal);
  }
}
