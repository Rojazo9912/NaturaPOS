import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      rawBody: true,
    });

    // Seguridad
    app.use(helmet());
    app.use(compression());

    // CORS
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') || '*';
    app.enableCors({
      origin: frontendUrl === '*' ? '*' : [frontendUrl, `${frontendUrl}/`, 'http://localhost:3000'],
      credentials: true,
    });

    // Validación global de DTOs
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Prefijo global de API
    app.setGlobalPrefix('api/v1');

    const port = process.env.PORT || 3001;

    // Escuchar en 0.0.0.0 es crítico para Docker/Railway
    await app.listen(port, '0.0.0.0');
    logger.log(`🌿 Natural OS API corriendo en: http://0.0.0.0:${port}/api/v1`);
  } catch (error: any) {
    const logger = new Logger('Bootstrap');
    logger.error('❌ Error fatal en bootstrap:');
    logger.error(error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

bootstrap();

