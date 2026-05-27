import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cash-register')
@UseGuards(JwtAuthGuard)
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get('active')
  getActive(@CurrentUser() user: any) {
    return this.cashRegisterService.getActive(user.branchId, user.id);
  }

  @Post('open')
  open(@CurrentUser() user: any, @Body() dto: { openingAmount: number }) {
    return this.cashRegisterService.open(user.branchId, user.id, dto.openingAmount);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: { closingAmount: number; notes?: string; fiscalPercentage?: number }
  ) {
    return this.cashRegisterService.close(id, user.id, dto.closingAmount, dto.notes, dto.fiscalPercentage);
  }

  @Get('history')
  getHistory(@CurrentUser() user: any) {
    return this.cashRegisterService.getHistory(user.branchId);
  }

  @Get(':id/breakdown')
  getBreakdown(@Param('id') id: string) {
    return this.cashRegisterService.getBreakdown(id);
  }

  @Get('active/movements')
  getActiveMovements(@CurrentUser() user: any) {
    return this.cashRegisterService.getActiveMovements(user.branchId, user.id);
  }

  @Post('movements')
  createMovement(@CurrentUser() user: any, @Body() dto: { type: 'IN' | 'OUT'; amount: number; reason: string }) {
    return this.cashRegisterService.createMovement(user.id, user.branchId, dto);
  }
}
