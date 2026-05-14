import { Controller, Get, Post, Body, UseGuards, Param, Put } from '@nestjs/common';
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

  // ── INGREDIENTS ──
  @Get('ingredients')
  getIngredients(@CurrentUser() user: any) {
    return this.inventoryService.getIngredients(user.organizationId);
  }

  @Post('ingredients')
  createIngredient(@CurrentUser() user: any, @Body() dto: any) {
    return this.inventoryService.createIngredient(user.organizationId, dto);
  }

  @Put('ingredients/:id')
  updateIngredient(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: any) {
    return this.inventoryService.updateIngredient(id, user.organizationId, dto);
  }
}
