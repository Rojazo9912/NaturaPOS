import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🌱 Iniciando seed de Natural OS...\n');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // ─── 1. Organización Principal ───────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'natural-by-nutrit' },
    update: {},
    create: {
      name: 'Natural by Nutrit',
      slug: 'natural-by-nutrit',
      plan: 'PRO',
    },
  });
  console.log(`✅ Organización: ${org.name}`);

  // ─── 2. Sucursal Principal ────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-main' },
    update: {},
    create: {
      id: 'branch-main',
      organizationId: org.id,
      name: 'Sucursal Principal',
      address: 'Dirección principal',
      phone: '',
    },
  });
  console.log(`✅ Sucursal: ${branch.name}`);

  // ─── 3. Usuario Owner ─────────────────────────────────────────
  const passwordHash = await bcrypt.hash('NaturaAdmin2026!', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'admin@naturalbynutrit.com' },
    update: {},
    create: {
      organizationId: org.id,
      branchId: branch.id,
      email: 'admin@naturalbynutrit.com',
      passwordHash,
      name: 'Administrador Natural',
      role: 'OWNER',
    },
  });
  console.log(`✅ Usuario Owner: ${owner.email}`);

  // ─── 4. Categorías base ───────────────────────────────────────
  const categories = [
    { name: 'Smoothies', emoji: '🥤', color: '#22c55e' },
    { name: 'Proteínas', emoji: '💪', color: '#3b82f6' },
    { name: 'Ensaladas', emoji: '🥗', color: '#84cc16' },
    { name: 'Shots Wellness', emoji: '⚡', color: '#f59e0b' },
    { name: 'Suplementos', emoji: '🧪', color: '#8b5cf6' },
    { name: 'Snacks', emoji: '🍫', color: '#ec4899' },
  ];

  for (const [i, cat] of categories.entries()) {
    await prisma.category.upsert({
      where: { id: `cat-${i + 1}` },
      update: {},
      create: {
        id: `cat-${i + 1}`,
        organizationId: org.id,
        ...cat,
        sortOrder: i,
      },
    });
  }
  console.log(`✅ ${categories.length} categorías creadas`);

  console.log('\n🎉 Seed completado exitosamente!\n');
  console.log('─────────────────────────────────────────');
  console.log('📧 Email:    admin@naturalbynutrit.com');
  console.log('🔑 Password: NaturaAdmin2026!');
  console.log('─────────────────────────────────────────\n');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Error en seed:', e);
  process.exit(1);
});
