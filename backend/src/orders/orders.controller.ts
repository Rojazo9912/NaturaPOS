import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAllToday(@CurrentUser() user: any) {
    return this.ordersService.findAllToday(user.branchId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() createOrderDto: any) {
    return this.ordersService.create(user, createOrderDto);
  }
}
