import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('search')
  search(@CurrentUser() user: any, @Query('phone') phone: string) {
    return this.customersService.searchByPhone(user.organizationId, phone || '');
  }

  @Post()
  create(@CurrentUser() user: any, @Body() createCustomerDto: any) {
    return this.customersService.create(user.organizationId, createCustomerDto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customersService.findOne(user.organizationId, id);
  }
}
