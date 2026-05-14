import { Controller, Post, Body, Headers, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  createCheckout(@Body() body: { customerId: string; planId: string }) {
    return this.paymentsService.createCheckoutSession(body.customerId, body.planId);
  }

  @Post('webhook')
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(signature, (req as any).rawBody);
  }
}
