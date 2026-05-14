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
