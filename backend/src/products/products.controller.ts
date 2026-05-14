import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.productsService.findAll(user.organizationId);
  }

  @Get('categories')
  findCategories(@CurrentUser() user: any) {
    return this.productsService.findCategories(user.organizationId);
  }

  @Post()
  @Roles('ADMIN', 'OWNER')
  create(@CurrentUser() user: any, @Body() createProductDto: any) {
    return this.productsService.create(user.organizationId, createProductDto);
  }

  @Put(':id')
  @Roles('ADMIN', 'OWNER')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() updateProductDto: any) {
    return this.productsService.update(id, user.organizationId, updateProductDto);
  }

  // ── RECIPES ──
  @Get(':id/recipe')
  getRecipe(@Param('id') id: string) {
    return this.productsService.getRecipe(id);
  }

  @Post(':id/recipe')
  @Roles('ADMIN', 'OWNER')
  upsertRecipe(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.upsertRecipe(id, dto);
  }
}
