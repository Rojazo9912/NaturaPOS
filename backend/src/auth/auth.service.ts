import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as QRCode from 'qrcode';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authenticator } = require('otplib');

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, isActive: true },
    });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  async generateTwoFactorSecret(user: any) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'NaturaPOS', secret);
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
    return { secret, qrCodeDataURL };
  }

  async verifyTwoFactorCode(code: string, secret: string) {
    return authenticator.verify({ token: code, secret });
  }

  async login(user: any) {
    if (user.mfaEnabled) {
      return { mfaRequired: true, userId: user.id };
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      branchId: user.branchId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        branchId: user.branchId,
      },
    };
  }

  async saveMfaSecret(userId: string, secret: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
        mfaEnabled: true,
      },
    });
  }

  async loginWithMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) throw new UnauthorizedException('Usuario no válido');

    const isValid = await this.verifyTwoFactorCode(code, user.mfaSecret);
    if (!isValid) throw new UnauthorizedException('Código inválido');

    // Return full login (token)
    return this.login({ ...user, mfaEnabled: false }); // Bypass check in recursion
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        organizationId: true,
        branchId: true,
        riskScore: true,
        organization: { select: { name: true, slug: true, plan: true } },
        branch: { select: { name: true, address: true } },
        createdAt: true,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Contraseña actual incorrecta');

    if (newPassword.length < 6) throw new UnauthorizedException('La nueva contraseña debe tener al menos 6 caracteres');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true, message: 'Contraseña actualizada correctamente' };
  }
}
