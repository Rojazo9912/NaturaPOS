import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Config global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting — seguridad básica
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Base de datos
    PrismaModule,

    // TODO: Agregar módulos de dominio aquí
    // AuthModule,
    // UsersModule,
    // OrdersModule,
    // ProductsModule,
    // CustomersModule,
    // InventoryModule,
    // CashRegisterModule,
    // DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
