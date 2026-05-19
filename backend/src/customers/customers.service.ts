import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async searchByPhone(organizationId: string, phone: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        organizationId,
        phone: { contains: phone },
      },
      take: 10,
    });
    return customers;
  }

  async findOne(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async create(organizationId: string, data: any) {
    return this.prisma.customer.create({
      data: {
        organizationId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        allergies: data.allergies,
      },
    });
  }
}
