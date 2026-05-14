import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🌱 Iniciando seed de Productos...\n');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.log('No org found');
    return;
  }

  const categories = await prisma.category.findMany();
  const getCatId = (name: string) => categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id;

  const products = [
    { name: 'Green Power', price: 89, categoryName: 'smoothies', emoji: '🥤', description: 'Espinaca, manzana, jengibre' },
    { name: 'Berry Blast', price: 95, categoryName: 'smoothies', emoji: '🫐', description: 'Berries, proteína, miel' },
    { name: 'Tropical Zen', price: 79, categoryName: 'smoothies', emoji: '🍍', description: 'Mango, piña, coco' },
    { name: 'Choco Protein', price: 105, categoryName: 'smoothies', emoji: '🍫', description: 'Whey, cacao, almendra' },
    { name: 'Sunrise', price: 85, categoryName: 'smoothies', emoji: '🌅', description: 'Zanahoria, naranja, cúrcuma' },
    { name: 'Whey Vainilla', price: 180, categoryName: 'proteínas', emoji: '💪', description: 'Scoop 30g whey protein' },
    { name: 'Creatina 5g', price: 80, categoryName: 'proteínas', emoji: '⚡', description: 'Creatina monohidrato' },
    { name: 'BCAA Tropical', price: 95, categoryName: 'proteínas', emoji: '🏋️', description: 'Aminoácidos esenciales' },
    { name: 'Bowl Mediterráneo', price: 130, categoryName: 'ensaladas', emoji: '🥗', description: 'Quinoa, aguacate, tomate' },
    { name: 'Bowl Proteíco', price: 145, categoryName: 'ensaladas', emoji: '🥙', description: 'Pollo, arroz, vegetales' },
    { name: 'Shot Jengibre', price: 35, categoryName: 'shots', emoji: '🔥', description: 'Jengibre + limón + pimienta' },
    { name: 'Shot Cúrcuma', price: 35, categoryName: 'shots', emoji: '✨', description: 'Cúrcuma + pimienta negra' },
    { name: 'Shot Verde', price: 40, categoryName: 'shots', emoji: '🌿', description: 'Wheatgrass + espirulina' },
    { name: 'Colágeno', price: 90, categoryName: 'suplementos', emoji: '🌟', description: 'Colágeno hidrolizado' },
    { name: 'Omega 3', price: 120, categoryName: 'suplementos', emoji: '🐟', description: '1000mg EPA+DHA' },
    { name: 'Barra Proteína', price: 45, categoryName: 'snacks', emoji: '🍫', description: '20g proteína, bajo azúcar' },
    { name: 'Mix Nueces', price: 55, categoryName: 'snacks', emoji: '🥜', description: 'Trail mix premium' },
    { name: 'Granola Natural', price: 65, categoryName: 'snacks', emoji: '🌾', description: 'Sin azúcar añadida' },
  ];

  const existingCount = await prisma.product.count({ where: { organizationId: org.id } });
  if (existingCount > 0) {
    console.log(`Ya existen ${existingCount} productos en la base de datos. Saltando seed.`);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  for (const prod of products) {
    const categoryId = getCatId(prod.categoryName);
    if (!categoryId) continue;

    await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId,
        name: prod.name,
        description: prod.description,
        price: prod.price,
      }
    });
  }

  console.log(`✅ ${products.length} productos insertados/actualizados`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
