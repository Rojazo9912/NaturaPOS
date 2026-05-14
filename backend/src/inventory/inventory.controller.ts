import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findByBranch(@CurrentUser() user: any) {
    return this.inventoryService.findByBranch(user.branchId);
  }

  @Post('adjust')
  adjust(@CurrentUser() user: any, @Body() dto: any) {
    return this.inventoryService.adjust(user.branchId, user.id, dto);
  }
}
