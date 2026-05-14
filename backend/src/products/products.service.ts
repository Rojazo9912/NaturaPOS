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

  async create(organizationId: string, data: any) {
    return this.prisma.product.create({
      data: {
        ...data,
        organizationId,
      },
    });
  }

  async update(id: string, organizationId: string, data: any) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }
}
