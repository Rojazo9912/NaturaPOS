import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      include: { category: true },
    });
  }

  async findCategories(organizationId: string) {
    return this.prisma.category.findMany({
      where: { organizationId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(organizationId: string, data: { name: string; emoji?: string }) {
    const count = await this.prisma.category.count({ where: { organizationId } });
    return this.prisma.category.create({
      data: {
        organizationId,
        name: data.name,
        emoji: data.emoji || '📦',
        sortOrder: count + 1,
      },
    });
  }

  async create(organizationId: string, data: any) {
    return this.prisma.product.create({
      data: {
        ...data,
        organizationId,
      },
    });
  }

  async update(id: string, organizationId: string, data: any) {
    return this.prisma.product.update({
      where: { id, organizationId },
      data,
    });
  }

  // ── RECIPES ──
  async getRecipe(productId: string) {
    return this.prisma.recipe.findUnique({
      where: { productId },
      include: {
        items: {
          include: { ingredient: true }
        }
      }
    });
  }

  async upsertRecipe(productId: string, data: { yieldQty: number; items: { ingredientId: string; quantity: number; unit: string }[] }) {
    // 1. Delete existing items if any
    const existingRecipe = await this.prisma.recipe.findUnique({ where: { productId } });
    if (existingRecipe) {
      await this.prisma.recipeItem.deleteMany({ where: { recipeId: existingRecipe.id } });
    }

    // 2. Upsert Recipe & Create Items
    return this.prisma.recipe.upsert({
      where: { productId },
      update: {
        yieldQty: data.yieldQty,
        items: {
          create: data.items.map(item => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit as any, // Enum
          }))
        }
      },
      create: {
        productId,
        yieldQty: data.yieldQty,
        items: {
          create: data.items.map(item => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit as any,
          }))
        }
      },
      include: { items: true }
    });
  }
}
