import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Body: { email, password }
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Body() _loginDto: LoginDto, // DTO solo para documentación / validación de tipo
    @CurrentUser() user: any,
  ) {
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/generate')
  async generateMfa(@CurrentUser() user: any) {
    return this.authService.generateTwoFactorSecret(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  async enableMfa(@CurrentUser() user: any, @Body() body: { code: string; secret: string }) {
    const isValid = await this.authService.verifyTwoFactorCode(body.code, body.secret);
    if (!isValid) throw new Error('Código inválido');
    
    // Save to DB
    return this.authService.saveMfaSecret(user.id, body.secret);
  }

  @Post('mfa/login')
  async mfaLogin(@Body() body: { userId: string; code: string }) {
    return this.authService.loginWithMfa(body.userId, body.code);
  }

  /**
   * GET /api/v1/auth/me
   * Header: Authorization: Bearer <token>
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }
}
