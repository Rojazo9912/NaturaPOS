"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcryptjs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function main() {
    console.log('🌱 Iniciando seed de Natural OS...\n');
    const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    const prisma = new client_1.PrismaClient({ adapter });
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
//# sourceMappingURL=seed.js.map