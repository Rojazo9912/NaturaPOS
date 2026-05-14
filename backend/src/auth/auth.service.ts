import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';

const { authenticator } = otplib as any;

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
}
