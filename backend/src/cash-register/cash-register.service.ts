import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

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

  async close(id: string, userId: string, closingAmount: number, notes?: string, fiscalPercentage?: number) {
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
    
    // Consultar todos los movimientos de efectivo del turno
    const movements = await this.prisma.cashMovement.findMany({
      where: { cashRegisterId: id },
    });

    const totalCashIn = movements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.amount, 0);
    const totalCashOut = movements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.amount, 0);

    const expectedAmount = register.openingAmount + totalCash + totalCashIn - totalCashOut;
    const difference     = closingAmount - expectedAmount;

    // Calcular porcentaje de declaración fiscal de efectivo
    let percentage = fiscalPercentage !== undefined ? fiscalPercentage : parseFloat(process.env.FISCAL_CASH_PERCENTAGE || '0.30');
    if (percentage > 1) {
      percentage = percentage / 100;
    }
    const declaredCash = totalCash * percentage;
    const fiscalSales = totalCard + totalTransfer + totalQR + declaredCash;
    const totalTax = orders.reduce((s, o) => s + (o.taxAmount || 0), 0);

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
        taxAmount: totalTax,
        notes,
        type: 'ADMIN' as const,
      };

      // Crear corte B (Fiscal/Contable - Filtra pagos rastreables + porcentaje cash)
      const cutDataFiscal = {
        cashRegisterId: id,
        totalSales: fiscalSales,
        totalCash: declaredCash,
        totalCard,
        totalTransfer,
        totalWallet: 0, // Wallet interna no fiscal
        totalQR,
        totalRefunds: 0,
        totalDiscounts: 0, // Los descuentos son de operación interna
        totalWaste: 0,
        grossProfit: fiscalSales - (totalCost * (fiscalSales / (totalSales || 1))),
        netProfit: fiscalSales - (totalCost * (fiscalSales / (totalSales || 1))),
        taxAmount: totalTax * (fiscalSales / (totalSales || 1)),
        notes: notes ? `Fiscal (${Math.round(percentage * 100)}%) - ${notes}` : `Corte Fiscal de Turno (${Math.round(percentage * 100)}%)`,
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
        totalCost,
        openingAmount: register.openingAmount,
        closingAmount,
        expectedAmount,
        difference,
        taxAmount: totalTax,
        notes,
        cutDataAdmin,
        cutDataFiscal
      }).catch(err => console.error('Error enviando email de cierre:', err));

      return { register: updated, summary: { totalSales, totalCash, difference, ordersCount: orders.length, totalCashIn, totalCashOut } };
    });
  }

  async createMovement(userId: string, branchId: string, data: { type: 'IN' | 'OUT'; amount: number; reason: string }) {
    const active = await this.prisma.cashRegister.findFirst({
      where: { branchId, userId, status: 'OPEN' },
    });
    if (!active) {
      throw new BadRequestException('No tienes ninguna caja abierta para registrar movimientos de efectivo');
    }

    return this.prisma.cashMovement.create({
      data: {
        cashRegisterId: active.id,
        type: data.type as any,
        amount: Math.abs(data.amount),
        reason: data.reason,
      },
    });
  }

  async getActiveMovements(branchId: string, userId: string) {
    const active = await this.prisma.cashRegister.findFirst({
      where: { branchId, userId, status: 'OPEN' },
    });
    if (!active) return [];

    return this.prisma.cashMovement.findMany({
      where: { cashRegisterId: active.id },
      orderBy: { createdAt: 'desc' },
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
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #166534; margin: 0; font-size: 24px;">Cierre de Caja - Natural OS 🌿</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Reporte de Cierre de Caja A/B Contable</p>
        </div>
        
        <p><strong>Cajero:</strong> ${data.cashierName}</p>
        <p><strong>Ventas Totales (Bruto):</strong> $${data.totalSales.toFixed(2)}</p>
        <p><strong>Diferencia Físico vs Sistema:</strong> <span style="color: ${data.difference < 0 ? '#ef4444' : '#22c55e'}; font-weight: bold;">$${data.difference.toFixed(2)}</span></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        
        <h2 style="font-size: 18px; color: #374151; margin-bottom: 10px;">Detalle del Corte A (Operativo Real):</h2>
        <ul>
          <li>Fondo Inicial Apertura: $${data.openingAmount.toFixed(2)}</li>
          <li>Efectivo en Caja Recibido: $${data.cutDataAdmin.totalCash.toFixed(2)}</li>
          <li>Cobros con Tarjeta: $${data.cutDataAdmin.totalCard.toFixed(2)}</li>
          <li>Cobros por Transferencia: $${data.cutDataAdmin.totalTransfer.toFixed(2)}</li>
          <li>Cobros con Wallet/Puntos: $${data.cutDataAdmin.totalWallet.toFixed(2)}</li>
          <li>Cobros con Código QR: $${data.cutDataAdmin.totalQR.toFixed(2)}</li>
          <li>Descuentos Aplicados: $${data.cutDataAdmin.totalDiscounts.toFixed(2)}</li>
          <li>Aportes de Efectivo: $${data.totalCashIn.toFixed(2)}</li>
          <li>Retiros/Gastos de Caja: $${data.totalCashOut.toFixed(2)}</li>
          <li>Efectivo Esperado: $${data.expectedAmount.toFixed(2)}</li>
          <li>Efectivo Físico Declarado: $${data.closingAmount.toFixed(2)}</li>
        </ul>

        <h2 style="font-size: 18px; color: #1e40af; margin-top: 20px; margin-bottom: 10px;">Detalle del Corte B (Fiscal Contable):</h2>
        <ul>
          <li>Cobros Bancarios Registrados: $${(data.cutDataFiscal.totalCard + data.cutDataFiscal.totalTransfer + data.cutDataFiscal.totalQR).toFixed(2)}</li>
          <li>Efectivo Declarado: $${data.cutDataFiscal.totalCash.toFixed(2)}</li>
          <li>Ventas Totales Declaradas: $${data.cutDataFiscal.totalSales.toFixed(2)}</li>
          <li>Impuesto IVA Estimado (IVA Proporcional): $${data.cutDataFiscal.taxAmount.toFixed(2)}</li>
        </ul>
        
        <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 13px;">
          <strong>Nota de Cierre:</strong> ${data.notes || 'Ninguna registrada.'}
        </div>
        
        <p style="margin-top: 20px; font-size: 14px;">Se adjunta a este correo el reporte oficial en formato PDF conteniendo los desgloses de los <strong>Cortes A (Administrativo) y B (Fiscal)</strong> para su archivo y contabilidad.</p>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280;">
          <p>Enviado automáticamente por Natural OS 🌿</p>
        </div>
      </div>
    `;

    try {
      const pdfBuffer = await this.generateClosurePDF(data);
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
          html: html,
          attachments: [
            {
              filename: `Cierre_Caja_${data.branchName || 'Sucursal'}_${new Date().toISOString().split('T')[0]}.pdf`,
              content: pdfBuffer.toString('base64')
            }
          ]
        })
      });
      if (!res.ok) {
        console.error('Failed to send Resend email:', await res.text());
      } else {
        console.log('Email de cierre enviado a', data.adminEmail);
      }
    } catch (e) {
      console.error('Error fetching Resend API / generating PDF:', e);
    }
  }

  private generateClosurePDF(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40 });
        const chunks: Buffer[] = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', err => reject(err));
        
        // --- HEADER BANNER ---
        doc.rect(0, 0, 612, 12).fill('#166534');
        
        doc.moveDown(2);
        doc.fontSize(22).fillColor('#166534').text('NATURAL OS', { align: 'center' });
        doc.fontSize(9).fillColor('#6b7280').text('Suite Contable & CRM Wellness-Tech', { align: 'center' });
        doc.moveDown(1.5);
        
        doc.fontSize(13).fillColor('#1f2937').text(`REPORTE OFICIAL DE CIERRE DE CAJA: A/B CONTABLE`, { align: 'center', underline: true });
        doc.moveDown();
        
        // --- METRICS ---
        doc.fontSize(10).fillColor('#374151');
        doc.text(`Sucursal:       ${data.branchName || 'Sucursal Principal'}`);
        doc.text(`Cajero:         ${data.cashierName}`);
        doc.text(`Fecha/Hora:     ${new Date().toLocaleString()}`);
        doc.text(`Estatus:        CERRADA`);
        doc.moveDown();
        
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(572, doc.y).stroke();
        doc.moveDown();
        
        // --- CORTE A ---
        doc.fontSize(12).fillColor('#166534').text('CORTE A: VERDAD OPERATIVA (REAL)', { underline: true });
        doc.fontSize(9).fillColor('#4b5563');
        doc.text('Detalle completo de todas las operaciones físicas y digitales realizadas en el turno.');
        doc.moveDown(0.5);
        
        const drawRow = (label: string, val: string, isBold = false) => {
          doc.fontSize(9).fillColor(isBold ? '#111827' : '#374151');
          doc.text(label, { continued: true });
          doc.text(val, { align: 'right' });
        };
        
        drawRow('Monto de Apertura (Fondo Fijo):', `$${data.openingAmount.toFixed(2)} MXN`);
        drawRow('Ventas Totales Realizadas (Bruto):', `$${data.totalSales.toFixed(2)} MXN`);
        drawRow('Efectivo en Caja Recibido:', `$${data.cutDataAdmin.totalCash.toFixed(2)} MXN`);
        drawRow('Cobros con Tarjeta (Terminal):', `$${data.cutDataAdmin.totalCard.toFixed(2)} MXN`);
        drawRow('Cobros por Transferencia (SPEI):', `$${data.cutDataAdmin.totalTransfer.toFixed(2)} MXN`);
        drawRow('Cobros con Wallet/Puntos:', `$${data.cutDataAdmin.totalWallet.toFixed(2)} MXN`);
        drawRow('Cobros QR / Digital:', `$${data.cutDataAdmin.totalQR.toFixed(2)} MXN`);
        drawRow('Descuentos Aplicados:', `-$${data.cutDataAdmin.totalDiscounts.toFixed(2)} MXN`);
        
        doc.moveDown(0.3);
        doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(100, doc.y).lineTo(572, doc.y).stroke();
        doc.moveDown(0.3);
        
        drawRow('EFECTIVO ESPERADO EN CAJA:', `$${data.expectedAmount.toFixed(2)} MXN`, true);
        drawRow('EFECTIVO DECLARADO (FÍSICO):', `$${data.closingAmount.toFixed(2)} MXN`, true);
        
        const diffColor = data.difference < 0 ? '#b91c1c' : (data.difference > 0 ? '#15803d' : '#111827');
        doc.fontSize(10).fillColor(diffColor);
        doc.text('DIFERENCIA (Físico vs Sistema):', { continued: true });
        doc.text(`$${data.difference.toFixed(2)} MXN`, { align: 'right', underline: true });
        doc.moveDown();
        
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(572, doc.y).stroke();
        doc.moveDown();
        
        // --- CORTE B ---
        doc.fontSize(12).fillColor('#1e40af').text('CORTE B: VERDAD FISCAL (DECLARABLE BANCARIO)', { underline: true });
        doc.fontSize(9).fillColor('#4b5563');
        doc.text('Registro depurado para efectos de auditoría y conciliación fiscal de flujos bancarios directos.');
        doc.moveDown(0.5);
        
        const fiscalSales = data.cutDataFiscal.totalSales;
        const declaredCash = data.cutDataFiscal.totalCash;
        const bankSales = data.cutDataFiscal.totalCard + data.cutDataFiscal.totalTransfer + data.cutDataFiscal.totalQR;
        const cogsFiscal = data.totalCost * (fiscalSales / (data.totalSales || 1));
        
        drawRow('Ventas Totales Declarables:', `$${fiscalSales.toFixed(2)} MXN`);
        drawRow('Cobros en Efectivo Declarados:', `$${declaredCash.toFixed(2)} MXN`);
        drawRow('Cobros Bancarios Registrados:', `$${bankSales.toFixed(2)} MXN`);
        drawRow('Costo de Insumos Proporcional (COGS):', `$${cogsFiscal.toFixed(2)} MXN`);
        drawRow('IVA Estimado Recaudado (IVA Proporcional):', `$${data.cutDataFiscal.taxAmount.toFixed(2)} MXN`);
        
        doc.moveDown(0.3);
        doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(100, doc.y).lineTo(572, doc.y).stroke();
        doc.moveDown(0.3);
        
        drawRow('UTILIDAD OPERATIVA FISCAL ESTIMADA:', `$${(fiscalSales - cogsFiscal).toFixed(2)} MXN`, true);
        doc.moveDown();
        
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(572, doc.y).stroke();
        doc.moveDown();
        
        // --- NOTES & AUDIT FOOTER ---
        doc.fontSize(9).fillColor('#374151');
        doc.text('Notas / Observaciones del Cierre:', { underline: true });
        doc.fontSize(9).fillColor('#4b5563').font('Helvetica-Oblique');
        doc.text(data.notes || 'Ninguna observación registrada por el cajero.');
        doc.font('Helvetica'); // Reset font
        
        doc.moveDown(1.5);
        doc.strokeColor('#9ca3af').lineWidth(0.5).moveTo(206, doc.y).lineTo(406, doc.y).stroke();
        doc.moveDown(0.2);
        doc.fontSize(8).fillColor('#6b7280').text('Firma y Autorización del Operador', { align: 'center' });
        
        // Footer page marking
        const pageHeight = doc.page.height;
        doc.fontSize(8).fillColor('#9ca3af').text('Reporte Oficial Generado Automáticamente por Natural OS. Protegiendo la salud contable del negocio.', 40, pageHeight - 50, { align: 'center' });
        
        doc.end();
      } catch (err) {
        reject(err);
      }
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
