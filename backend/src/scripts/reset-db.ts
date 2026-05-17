import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetEverything() {
  console.log('🚀 Iniciando reinicio total de Natura POS...');

  try {
    // 1. Borrar datos transaccionales (Ventas y Finanzas)
    console.log('─ Limpiando transacciones y ventas...');
    await prisma.financialCut.deleteMany();
    await prisma.cashRegister.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.discount.deleteMany();
    await prisma.pointsHistory.deleteMany();
    await prisma.order.deleteMany();

    // 2. Borrar Clientes y Suscripciones
    console.log('─ Limpiando CRM y Clientes...');
    await prisma.customerSubscription.deleteMany();
    await prisma.customer.deleteMany();

    // 3. Borrar Inventario y Movimientos
    console.log('─ Limpiando Inventario y Movimientos...');
    await prisma.inventoryMovement.deleteMany();
    await prisma.transferItem.deleteMany();
    await prisma.inventoryTransfer.deleteMany();
    await prisma.branchInventory.deleteMany();

    // 4. Borrar Catálogo (Productos, Recetas, Insumos)
    console.log('─ Limpiando Catálogo y Recetas...');
    await prisma.recipeItem.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.comboItem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.subscriptionPlan.deleteMany();

    // 5. Borrar Logs y Alertas
    console.log('─ Limpiando Logs de Seguridad...');
    await prisma.riskAlert.deleteMany();
    await prisma.auditLog.deleteMany();

    console.log('\n✅ REINICIO COMPLETADO CON ÉXITO.');
    console.log('Se han preservado los Usuarios, Sucursales y la Organización.');
  } catch (error) {
    console.error('❌ ERROR DURANTE EL REINICIO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetEverything();
