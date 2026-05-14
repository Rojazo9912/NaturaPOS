import { RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createCheckout(body: {
        customerId: string;
        planId: string;
    }): Promise<{
        url: any;
    }>;
    webhook(signature: string, req: RawBodyRequest<Request>): Promise<{
        received: boolean;
    }>;
}
