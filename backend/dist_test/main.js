"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: ['error', 'warn', 'log'],
            rawBody: true,
        });
        app.use((0, helmet_1.default)());
        app.use((0, compression_1.default)());
        const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') || '*';
        app.enableCors({
            origin: frontendUrl === '*' ? '*' : [frontendUrl, `${frontendUrl}/`, 'http://localhost:3000'],
            credentials: true,
        });
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        app.setGlobalPrefix('api/v1');
        const port = process.env.PORT || 3001;
        await app.listen(port, '0.0.0.0');
        logger.log(`🌿 Natural OS API corriendo en: http://0.0.0.0:${port}/api/v1`);
    }
    catch (error) {
        const logger = new common_1.Logger('Bootstrap');
        logger.error('❌ Error fatal en bootstrap:');
        logger.error(error.message);
        logger.error(error.stack);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map