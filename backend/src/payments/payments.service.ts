import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private stripe: any;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_mock', {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  async createCheckoutSession(customerId: string, planId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });

    if (!customer || !plan) throw new Error('Cliente o Plan no encontrado');

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: plan.name,
              description: plan.description || '',
            },
            unit_amount: Math.round(plan.price * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${this.configService.get('FRONTEND_URL')}/pos?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/pos`,
      customer_email: customer.email || undefined,
      metadata: {
        customerId,
        planId,
      },
    });

    return { url: session.url };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, endpointSecret!);
    } catch (err) {
      throw new Error(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const { customerId, planId } = session.metadata!;

      await this.prisma.customerSubscription.create({
        data: {
          customerId,
          planId,
          status: 'ACTIVE',
          startDate: new Date(),
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Mock 30 days
        },
      });
    }

    return { received: true };
  }
}
