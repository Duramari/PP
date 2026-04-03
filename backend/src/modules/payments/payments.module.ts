// ═══════════════════════════════════════════════════════════════
// PAYMENTS MODULE — Stripe + Paystack + M-Pesa
// Factory pattern: country_code → provider auto-selected
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, Module, Controller, Post, Headers, Body, Req, Get, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';

// ── payment-provider.interface.ts ────────────────────────────
export interface PaymentInitResult {
  checkoutUrl?:    string;
  reference:       string;
  providerRef?:    string;
  clientSecret?:   string;  // Stripe
}

// ── providers/stripe.provider.ts ─────────────────────────────

@Injectable()
export class StripeProvider {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(private config: ConfigService) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY', 'sk_test_dummy'), {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(data: {
    businessId:    string;
    planId:        string;
    planName:      string;
    amount:        number;
    currency:      string;
    interval:      'month' | 'year';
    customerEmail: string;
    successUrl:    string;
    cancelUrl:     string;
    trialDays?:    number;
  }): Promise<PaymentInitResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode:                'subscription',
      payment_method_types:['card'],
      customer_email:       data.customerEmail,
      line_items: [{
        price_data: {
          currency:      data.currency.toLowerCase(),
          product_data:  { name: `Dialbee ${data.planName} Plan` },
          unit_amount:   Math.round(data.amount * 100),
          recurring:     { interval: data.interval },
        },
        quantity: 1,
      }],
      metadata: { businessId: data.businessId, planId: data.planId },
      success_url: data.successUrl,
      cancel_url:  data.cancelUrl,
      subscription_data: data.trialDays
        ? { trial_period_days: data.trialDays, metadata: { businessId: data.businessId, planId: data.planId } }
        : { metadata: { businessId: data.businessId, planId: data.planId } },
    });

    return { checkoutUrl: session.url!, reference: session.id };
  }

  async createWalletTopupSession(data: {
    businessId: string; amount: number; currency: string;
    customerEmail: string; successUrl: string; cancelUrl: string;
  }): Promise<PaymentInitResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode:                'payment',
      payment_method_types:['card'],
      customer_email:       data.customerEmail,
      line_items: [{
        price_data: {
          currency:     data.currency.toLowerCase(),
          product_data: { name: 'Dialbee Lead Wallet Top-Up' },
          unit_amount:  Math.round(data.amount * 100),
        },
        quantity: 1,
      }],
      metadata: { type: 'wallet_topup', businessId: data.businessId, amount: data.amount.toString() },
      success_url: data.successUrl,
      cancel_url:  data.cancelUrl,
    });

    return { checkoutUrl: session.url!, reference: session.id };
  }

  constructWebhookEvent(payload: Buffer, sig: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload, sig, this.config.get('STRIPE_WEBHOOK_SECRET', ''),
    );
  }

  getStripe(): Stripe { return this.stripe; }
}

// ── providers/paystack.provider.ts ───────────────────────────
@Injectable()
export class PaystackProvider {
  private readonly logger  = new Logger(PaystackProvider.name);
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private config: ConfigService) {}

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY', 'sk_test_dummy')}`,
      'Content-Type': 'application/json',
    };
  }

  async initializeTransaction(data: {
    email:       string;
    amount:      number;     // in MAJOR units (naira, cedis, etc.)
    currency:    string;     // NGN, GHS, ZAR
    reference:   string;
    callbackUrl: string;
    metadata:    Record<string, any>;
    planCode?:   string;     // for subscription
  }): Promise<PaymentInitResult> {
    const key = this.config.get('PAYSTACK_SECRET_KEY', 'sk_test_dummy');
    if (key === 'sk_test_dummy') {
      this.logger.warn('[DEV] Paystack dummy mode');
      return { checkoutUrl: `https://checkout.paystack.com/dev_${data.reference}`, reference: data.reference };
    }

    const payload: any = {
      email:        data.email,
      amount:       Math.round(data.amount * 100), // kobo/pesewas
      currency:     data.currency,
      reference:    data.reference,
      callback_url: data.callbackUrl,
      metadata:     data.metadata,
    };
    if (data.planCode) payload.plan = data.planCode;

    const res  = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST', headers: this.headers, body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!json.status) throw new Error(`Paystack error: ${json.message}`);
    return { checkoutUrl: json.data.authorization_url, reference: json.data.reference };
  }

  async verifyTransaction(reference: string): Promise<{
    status: string; amount: number; currency: string; metadata: any;
  }> {
    const res  = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: this.headers,
    });
    const json = await res.json();
    if (!json.status) throw new Error('Paystack verification failed');

    return {
      status:   json.data.status,           // 'success'
      amount:   json.data.amount / 100,
      currency: json.data.currency,
      metadata: json.data.metadata,
    };
  }

  async createPlan(data: { name: string; amount: number; currency: string; interval: 'monthly' | 'annually' }) {
    const res  = await fetch(`${this.baseUrl}/plan`, {
      method: 'POST', headers: this.headers,
      body: JSON.stringify({
        name:     data.name,
        amount:   Math.round(data.amount * 100),
        interval: data.interval,
        currency: data.currency,
      }),
    });
    return (await res.json()).data;
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash   = crypto.createHmac('sha512', this.config.get('PAYSTACK_SECRET_KEY', ''))
      .update(body).digest('hex');
    return hash === signature;
  }
}

// ── providers/mpesa.provider.ts ───────────────────────────────
@Injectable()
export class MpesaProvider {
  private readonly logger = new Logger(MpesaProvider.name);

  constructor(private config: ConfigService) {}

  async stkPush(data: {
    phone:       string;  // 254XXXXXXXXX
    amount:      number;  // KES
    accountRef:  string;
    description: string;
  }): Promise<{ checkoutRequestId: string; reference: string }> {
    const shortcode = this.config.get('MPESA_SHORTCODE', '174379');
    const passkey   = this.config.get('MPESA_PASSKEY', '');

    if (!passkey || passkey === '') {
      this.logger.warn('[DEV] M-Pesa dummy mode');
      return { checkoutRequestId: `dev_${Date.now()}`, reference: `mpesa_dev_${Date.now()}` };
    }

    const token     = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const phone = data.phone.replace(/^0/, '254').replace(/^\+/, '');

    const res = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password:          password,
          Timestamp:         timestamp,
          TransactionType:   'CustomerPayBillOnline',
          Amount:            Math.round(data.amount),
          PartyA:            phone,
          PartyB:            shortcode,
          PhoneNumber:       phone,
          CallBackURL:       `${this.config.get('APP_URL')}/api/v1/webhooks/mpesa`,
          AccountReference:  data.accountRef,
          TransactionDesc:   data.description,
        }),
      },
    );

    const json = await res.json();
    if (json.ResponseCode !== '0') throw new Error(`M-Pesa error: ${json.ResponseDescription}`);

    return { checkoutRequestId: json.CheckoutRequestID, reference: json.MerchantRequestID };
  }

  private async getAccessToken(): Promise<string> {
    const key    = this.config.get('MPESA_CONSUMER_KEY', '');
    const secret = this.config.get('MPESA_CONSUMER_SECRET', '');
    const auth   = Buffer.from(`${key}:${secret}`).toString('base64');

    const res  = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` },
    });
    const json = await res.json();
    return json.access_token;
  }
}

// ── payments.factory.ts ───────────────────────────────────────
@Injectable()
export class PaymentsFactory {
  static readonly COUNTRY_PROVIDERS: Record<string, string> = {
    NG: 'paystack', GH: 'paystack', ZA: 'paystack',
    KE: 'mpesa',
    GB: 'stripe', FR: 'stripe', DE: 'stripe',
    ES: 'stripe', IT: 'stripe', NL: 'stripe', EG: 'stripe',
  };

  getProvider(countryCode: string): 'stripe' | 'paystack' | 'mpesa' {
    return (PaymentsFactory.COUNTRY_PROVIDERS[countryCode?.toUpperCase()] ?? 'stripe') as any;
  }
}

// ── webhooks.controller.ts (handles Stripe + Paystack + M-Pesa) ──
import { RawBodyRequest } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private stripe:    StripeProvider,
    private paystack:  PaystackProvider,
    @InjectQueue('notifications') private notifQueue: Queue,
    @InjectQueue('es-sync')       private esQueue:    Queue,
    private dataSource: DataSource,
  ) {}

  // ── Stripe webhook ────────────────────────────────────
  @Post('stripe')
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    let event: any;
    try {
      event = this.stripe.constructWebhookEvent(req.rawBody, sig);
    } catch (err) {
      this.logger.error('Stripe webhook signature failed', err.message);
      return { error: 'Invalid signature' };
    }

    this.logger.log(`Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleStripeCheckoutCompleted(event.data.object); break;
      case 'invoice.payment_succeeded':
        await this.handleStripeInvoicePaid(event.data.object); break;
      case 'invoice.payment_failed':
        await this.handleStripeInvoiceFailed(event.data.object); break;
      case 'customer.subscription.deleted':
        await this.handleStripeCanceled(event.data.object); break;
    }

    return { received: true };
  }

  // ── Paystack webhook ──────────────────────────────────
  @Post('paystack')
  async paystackWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') sig: string,
    @Req() req: Request,
  ) {
    const rawBody = JSON.stringify(body);
    if (!this.paystack.verifyWebhookSignature(rawBody, sig)) {
      this.logger.error('Paystack signature invalid');
      return { error: 'Invalid signature' };
    }

    this.logger.log(`Paystack event: ${body.event}`);

    if (body.event === 'charge.success') {
      await this.handlePaystackChargeSuccess(body.data);
    } else if (body.event === 'subscription.create') {
      await this.handlePaystackSubscriptionCreated(body.data);
    }

    return { received: true };
  }

  // ── M-Pesa STK callback ───────────────────────────────
  @Post('mpesa')
  async mpesaCallback(@Body() body: any) {
    const cb = body?.Body?.stkCallback;
    if (!cb) return { ResultCode: 1, ResultDesc: 'Invalid' };

    if (cb.ResultCode === 0) {
      // Payment successful
      const items  = cb.CallbackMetadata?.Item ?? [];
      const amount = items.find((i: any) => i.Name === 'Amount')?.Value;
      const mpesaRef = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
      const phone    = items.find((i: any) => i.Name === 'PhoneNumber')?.Value;

      await this.handleMpesaSuccess({ checkoutRequestId: cb.CheckoutRequestID, amount, mpesaRef, phone });
    }

    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  // ── Stripe handlers ───────────────────────────────────
  private async handleStripeCheckoutCompleted(session: any) {
    const { type, businessId, amount } = session.metadata ?? {};

    if (type === 'wallet_topup') {
      await this.topUpWallet(businessId, parseFloat(amount), 'USD', `stripe:${session.id}`);
    }
  }

  private async handleStripeInvoicePaid(invoice: any) {
    const { businessId, planId } = invoice.subscription_data?.metadata ?? invoice.lines?.data?.[0]?.metadata ?? {};
    if (!businessId || !planId) return;

    await this.activateSubscription(businessId, planId, invoice.amount_paid / 100, invoice.currency.toUpperCase());
    await this.notifQueue.add('subscription-activated', { businessId, planName: planId, expiresAt: '30 days from now' });
  }

  private async handleStripeInvoiceFailed(invoice: any) {
    const businessId = invoice.lines?.data?.[0]?.metadata?.businessId;
    if (!businessId) return;

    await this.dataSource.query(
      `UPDATE subscriptions SET status = 'past_due' WHERE stripe_customer_id = $1`,
      [invoice.customer],
    );
    await this.notifQueue.add('payment-failed', { businessId, invoiceUrl: invoice.hosted_invoice_url });
  }

  private async handleStripeCanceled(sub: any) {
    const businessId = sub.metadata?.businessId;
    if (!businessId) return;

    await this.deactivateSubscription(businessId);
  }

  // ── Paystack handlers ─────────────────────────────────
  private async handlePaystackChargeSuccess(data: any) {
    const { type, businessId, amount } = data.metadata ?? {};

    if (type === 'wallet_topup') {
      await this.topUpWallet(businessId, parseFloat(amount), data.currency, `paystack:${data.reference}`);
    } else if (type === 'subscription') {
      await this.activateSubscription(businessId, data.metadata.planId, data.amount / 100, data.currency);
    }
  }

  private async handlePaystackSubscriptionCreated(data: any) {
    const businessId = data.metadata?.businessId;
    if (!businessId) return;

    await this.dataSource.query(
      `UPDATE subscriptions SET status = 'active', paystack_sub_code = $1 WHERE business_id = $2`,
      [data.subscription_code, businessId],
    );
  }

  // ── M-Pesa handlers ───────────────────────────────────
  private async handleMpesaSuccess(data: { checkoutRequestId: string; amount: number; mpesaRef: string; phone: string }) {
    // Find pending payment by checkout request
    const pending = await this.dataSource.query(
      `SELECT metadata FROM payments WHERE metadata->>'mpesaCheckoutId' = $1 AND status = 'pending'`,
      [data.checkoutRequestId],
    );

    if (!pending.length) return;
    const { businessId, type, planId } = pending[0].metadata;

    await this.dataSource.query(
      `UPDATE payments SET status = 'completed', provider_ref = $1 WHERE metadata->>'mpesaCheckoutId' = $2`,
      [data.mpesaRef, data.checkoutRequestId],
    );

    if (type === 'wallet_topup') {
      await this.topUpWallet(businessId, data.amount, 'KES', `mpesa:${data.mpesaRef}`);
    } else if (type === 'subscription') {
      await this.activateSubscription(businessId, planId, data.amount, 'KES');
    }
  }

  // ── Shared helpers ────────────────────────────────────
  private async topUpWallet(businessId: string, amount: number, currency: string, providerRef: string) {
    await this.dataSource.query(
      `INSERT INTO lead_wallets (id, business_id, balance, currency_code, total_topped_up, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $2, NOW())
       ON CONFLICT (business_id) DO UPDATE
       SET balance = lead_wallets.balance + $2, total_topped_up = lead_wallets.total_topped_up + $2, updated_at = NOW()`,
      [businessId, amount, currency],
    );
    this.logger.log(`Wallet topped up: ${businessId} +${amount} ${currency}`);
  }

  private async activateSubscription(businessId: string, planId: string, amount: number, currency: string) {
    const tierMap: Record<string, string> = {
      standard:   'standard', premium:   'premium', enterprise: 'enterprise',
      standard_m: 'standard', premium_m: 'premium',
    };
    const tier = tierMap[planId] ?? planId.split('_')[0];

    await this.dataSource.query(
      `UPDATE businesses SET subscription_tier = $1,
       subscription_expires_at = NOW() + INTERVAL '31 days' WHERE id = $2`,
      [tier, businessId],
    );
    await this.esQueue.add('index', { id: businessId });
    this.logger.log(`Subscription activated: ${businessId} → ${tier}`);
  }

  private async deactivateSubscription(businessId: string) {
    await this.dataSource.query(
      `UPDATE businesses SET subscription_tier = 'free', subscription_expires_at = NULL WHERE id = $1`,
      [businessId],
    );
    await this.esQueue.add('index', { id: businessId });
  }
}

// ── payments.module.ts ─────────────────────────────────────────
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }, { name: 'es-sync' }),
  ],
  controllers: [WebhooksController],
  providers:   [StripeProvider, PaystackProvider, MpesaProvider, PaymentsFactory],
  exports:     [StripeProvider, PaystackProvider, MpesaProvider, PaymentsFactory],
})
export class PaymentsModule {}
