import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.transfersService.findAll(user.branchId);
  }

  @Get('branches')
  getBranches(@CurrentUser() user: any) {
    return this.transfersService.getBranches(user.organizationId, user.branchId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.transfersService.create(user.id, data);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED',
    @CurrentUser() user: any,
  ) {
    return this.transfersService.updateStatus(id, status, user.id);
  }
}
