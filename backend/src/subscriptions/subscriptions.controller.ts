import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  getPlans(@CurrentUser() user: any) {
    return this.subscriptionsService.getPlans(user.organizationId);
  }

  @Post('plans')
  createPlan(@CurrentUser() user: any, @Body() data: any) {
    return this.subscriptionsService.createPlan(user.organizationId, data);
  }

  @Get('customers')
  getCustomerSubscriptions(@CurrentUser() user: any) {
    return this.subscriptionsService.getCustomerSubscriptions(user.organizationId);
  }

  @Post('customers/:id/subscribe')
  subscribeCustomer(@Param('id') customerId: string, @Body() body: { planId: string }) {
    return this.subscriptionsService.subscribeCustomer(customerId, body.planId);
  }
}
