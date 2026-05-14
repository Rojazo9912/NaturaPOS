import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: any) {
    return this.dashboardService.getSummary(user.branchId);
  }

  @Get('top-products')
  getTopProducts(@CurrentUser() user: any) {
    return this.dashboardService.getTopProducts(user.branchId);
  }

  @Get('sales-by-hour')
  getSalesByHour(@CurrentUser() user: any) {
    return this.dashboardService.getSalesByHour(user.branchId);
  }
}
