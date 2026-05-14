"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async searchByPhone(organizationId, phone) {
        const customers = await this.prisma.customer.findMany({
            where: {
                organizationId,
                phone: { contains: phone },
            },
            take: 10,
        });
        return customers;
    }
    async findOne(organizationId, id) {
        const customer = await this.prisma.customer.findFirst({
            where: { id, organizationId },
            include: {
                orders: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!customer)
            throw new common_1.NotFoundException('Cliente no encontrado');
        return customer;
    }
    async create(organizationId, data) {
        return this.prisma.customer.create({
            data: {
                organizationId,
                name: data.name,
                phone: data.phone,
                email: data.email,
            },
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map