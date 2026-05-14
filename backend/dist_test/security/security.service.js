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
exports.SecurityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const events_gateway_1 = require("./events.gateway");
let SecurityService = class SecurityService {
    constructor(prisma, eventsGateway) {
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
    }
    async createAlert(data) {
        const alert = await this.prisma.riskAlert.create({ data });
        this.eventsGateway.emitAlert(data.organizationId, alert);
        return alert;
    }
    async getAuditLogs(organizationId) {
        return this.prisma.auditLog.findMany({
            where: { organizationId },
            include: {
                user: { select: { name: true, role: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async getRiskAlerts(organizationId) {
        return this.prisma.riskAlert.findMany({
            where: { organizationId },
            include: {
                branch: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
    }
    async resolveRiskAlert(id, organizationId) {
        return this.prisma.riskAlert.update({
            where: { id, organizationId },
            data: { isResolved: true }
        });
    }
};
exports.SecurityService = SecurityService;
exports.SecurityService = SecurityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway])
], SecurityService);
//# sourceMappingURL=security.service.js.map