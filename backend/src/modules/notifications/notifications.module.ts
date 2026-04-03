// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS MODULE
// Channels: SMS (Twilio + Africa's Talking) + WhatsApp + Email + Push
// Auto-routes by country (Africa → AT, Europe → Twilio)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger }  from '@nestjs/common';
import { ConfigService }       from '@nestjs/config';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import * as nodemailer from 'nodemailer';

// ── SMS Router ────────────────────────────────────────────────
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private readonly africaCodes = ['+234','+254','+27','+233','+20','+225','+237','+255','+256'];

  constructor(private config: ConfigService) {}

  async send(phone: string, message: string): Promise<boolean> {
    if (!phone) return false;

    try {
      if (this.isAfrican(phone)) {
        return this.sendViaAfricasTalking(phone, message);
      } else {
        return this.sendViaTwilio(phone, message);
      }
    } catch (err) {
      this.logger.error(`SMS failed to ${phone}: ${err.message}`);
      return false;
    }
  }

  // Africa's Talking — cheaper, better delivery in Africa
  private async sendViaAfricasTalking(phone: string, message: string): Promise<boolean> {
    const apiKey   = this.config.get('AFRICAS_TALKING_API_KEY');
    const username = this.config.get('AFRICAS_TALKING_USERNAME');

    if (!apiKey || apiKey === 'your_at_key') {
      this.logger.warn(`[DEV] SMS to ${phone}: ${message.slice(0, 50)}...`);
      return true;
    }

    const body = new URLSearchParams({
      username,
      to:      phone,
      message,
      from:    'Dialbee',
    });

    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const data = await res.json();
    return data?.SMSMessageData?.Recipients?.[0]?.status === 'Success';
  }

  // Twilio — Europe + fallback
  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    const sid   = this.config.get('TWILIO_ACCOUNT_SID');
    const token = this.config.get('TWILIO_AUTH_TOKEN');
    const from  = this.config.get('TWILIO_FROM_NUMBER');

    if (!sid || sid === 'AC_your_sid') {
      this.logger.warn(`[DEV] Twilio SMS to ${phone}: ${message.slice(0, 50)}...`);
      return true;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    const body = new URLSearchParams({ From: from, To: phone, Body: message });
    const res  = await fetch(url, {
      method:  'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    return res.ok;
  }

  private isAfrican(phone: string): boolean {
    return this.africaCodes.some(code => phone.startsWith(code));
  }
}

// ── WhatsApp Service ──────────────────────────────────────────
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private config: ConfigService) {}

  async sendText(phone: string, message: string): Promise<boolean> {
    const apiKey  = this.config.get('WHATSAPP_API_KEY');
    const phoneId = this.config.get('WHATSAPP_PHONE_ID');

    if (!apiKey || apiKey === 'your_whatsapp_key') {
      this.logger.warn(`[DEV] WhatsApp to ${phone}:\n${message.slice(0, 100)}`);
      return true;
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to:   phone.replace(/[^0-9]/g, ''),
            type: 'text',
            text: { preview_url: false, body: message },
          }),
        },
      );
      return res.ok;
    } catch (err) {
      this.logger.error(`WhatsApp failed to ${phone}: ${err.message}`);
      return false;
    }
  }

  // Template message for new lead (pre-approved WhatsApp template)
  async sendLeadTemplate(phone: string, vars: {
    businessName: string;
    customerName: string;
    service:      string;
    city:         string;
  }): Promise<boolean> {
    const apiKey  = this.config.get('WHATSAPP_API_KEY');
    const phoneId = this.config.get('WHATSAPP_PHONE_ID');

    if (!apiKey || apiKey === 'your_whatsapp_key') {
      this.logger.warn(`[DEV] WA template to ${phone}: New lead for ${vars.businessName}`);
      return true;
    }

    // Using free-form text as fallback (templates require Meta approval)
    return this.sendText(phone,
      `🎯 *New Lead — Dialbee*\n\n` +
      `Business: ${vars.businessName}\n` +
      `Customer: ${vars.customerName}\n` +
      `Service: ${vars.service}\n` +
      `City: ${vars.city}\n\n` +
      `👉 Open your Dialbee dashboard to respond!\n` +
      `⚡ Fastest response wins the customer.`,
    );
  }
}

// ── Email Service ─────────────────────────────────────────────
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: this.config.get('SMTP_PORT', 1025),
      secure: false,
      auth: this.config.get('SMTP_USER')
        ? { user: this.config.get('SMTP_USER'), pass: this.config.get('SMTP_PASS') }
        : undefined,
    });
  }

  async sendNewLeadEmail(to: string, data: {
    businessName: string; customerName: string;
    customerPhone: string; customerMessage: string;
    dashboardUrl: string; qualityScore: number;
  }): Promise<void> {
    const qualityLabel = data.qualityScore >= 0.8 ? '🔥 HIGH QUALITY' : data.qualityScore >= 0.6 ? '✅ MEDIUM' : '📋 STANDARD';

    await this.transporter.sendMail({
      from:    `Dialbee <${this.config.get('EMAIL_FROM', 'noreply@dialbee.com')}>`,
      to,
      subject: `🎯 New Lead for ${data.businessName} — ${qualityLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1);">
            <!-- Header -->
            <div style="background: #e8421a; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎯 New Lead Received!</h1>
              <p style="color: rgba(255,255,255,.85); margin: 8px 0 0; font-size: 14px;">Someone needs your services on Dialbee</p>
            </div>

            <!-- Lead Details -->
            <div style="padding: 24px;">
              <div style="background: #fff8f5; border: 1px solid #ffd4c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #888; text-transform: uppercase; font-weight: bold;">Lead Quality</p>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${data.qualityScore >= 0.8 ? '#16a34a' : '#d97706'}">${qualityLabel}</p>
              </div>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #888; font-size: 13px; width: 35%;">Customer Name</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold;">${data.customerName || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #888; font-size: 13px;">Phone</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #e8421a;">${data.customerPhone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #888; font-size: 13px; vertical-align: top;">Message</td>
                  <td style="padding: 10px 0; line-height: 1.6;">${data.customerMessage || 'No message provided'}</td>
                </tr>
              </table>

              <div style="margin-top: 24px; text-align: center;">
                <a href="${data.dashboardUrl}" style="display: inline-block; background: #e8421a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  View Lead & Respond →
                </a>
              </div>

              <p style="text-align: center; color: #888; font-size: 12px; margin-top: 16px;">
                ⚡ Tip: Businesses that respond within 1 hour win 3x more customers
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9f9f9; padding: 16px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #aaa; font-size: 11px; margin: 0;">
                You're receiving this because your business is listed on Dialbee.<br>
                <a href="${data.dashboardUrl}/settings" style="color: #e8421a;">Manage notifications</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.transporter.sendMail({
      from:    `Dialbee <${this.config.get('EMAIL_FROM', 'noreply@dialbee.com')}>`,
      to,
      subject: `Welcome to Dialbee, ${name}! 🌍`,
      html: `
        <div style="font-family: Arial; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #e8421a;">Welcome to Dialbee, ${name}!</h2>
          <p>Your business listing has been created. Here's what to do next:</p>
          <ol>
            <li><strong>Complete your profile</strong> — Businesses with complete profiles get 2.4x more leads</li>
            <li><strong>Add photos</strong> — Visual businesses get 60% more clicks</li>
            <li><strong>Set working hours</strong> — So customers know when to call</li>
          </ol>
          <a href="${this.config.get('FRONTEND_URL')}/dashboard" style="display:inline-block;background:#e8421a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Go to Dashboard →
          </a>
        </div>
      `,
    });
  }

  async sendSubscriptionEmail(to: string, data: { planName: string; expiresAt: string }): Promise<void> {
    await this.transporter.sendMail({
      from:    `Dialbee <${this.config.get('EMAIL_FROM')}>`,
      to,
      subject: `✅ ${data.planName} Plan Activated!`,
      html: `<p>Your ${data.planName} plan is now active until ${data.expiresAt}. Your listing will now appear in top results!</p>`,
    });
  }

  // Public method to send raw email (used by notification processor)
  async sendRawMail(options: nodemailer.SendMailOptions): Promise<void> {
    await this.transporter.sendMail(options);
  }
}

// ── Notification Worker (BullMQ Processor) ──────────────────
@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private smsService:      SmsService,
    private waService:       WhatsAppService,
    private emailService:    EmailService,
    private dataSource:      DataSource,
    private config:          ConfigService,
  ) { super(); }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing notification: ${job.name}`);

    switch (job.name) {
      case 'new-lead':         return this.handleNewLead(job.data);
      case 'new-review':       return this.handleNewReview(job.data);
      case 'business-created': return this.handleBizCreated(job.data);
      case 'subscription-activated': return this.handleSubActivated(job.data);
      case 'payment-failed':   return this.handlePaymentFailed(job.data);
      case 'low-wallet':       return this.handleLowWallet(job.data);
    }
  }

  private async handleNewLead(data: { leadId: string; businessId: string; ownerId: string }) {
    const [lead, biz, owner] = await Promise.all([
      this.getLead(data.leadId),
      this.getBusiness(data.businessId),
      this.getUser(data.ownerId),
    ]);

    if (!lead || !biz || !owner) return;

    const dashUrl = `${this.config.get('FRONTEND_URL')}/dashboard/leads`;

    // Send all channels in parallel
    await Promise.allSettled([
      // Email (always)
      owner.email && this.emailService.sendNewLeadEmail(owner.email, {
        businessName:    biz.name,
        customerName:    lead.customer_name ?? 'Anonymous',
        customerPhone:   lead.customer_phone ?? 'Not provided',
        customerMessage: lead.customer_message ?? '',
        dashboardUrl:    dashUrl,
        qualityScore:    parseFloat(lead.quality_score),
      }),

      // SMS (if phone verified)
      owner.phone && this.smsService.send(owner.phone,
        `New lead on Dialbee! ${lead.customer_name ?? 'Customer'} needs help in ${biz.city_name}. Check dashboard: ${dashUrl}`,
      ),

      // WhatsApp (if set)
      owner.whatsapp_number && this.waService.sendLeadTemplate(owner.whatsapp_number, {
        businessName: biz.name,
        customerName: lead.customer_name ?? 'Customer',
        service:      lead.service_required ?? biz.category_name,
        city:         biz.city_name,
      }),
    ]);
  }

  private async handleNewReview(data: { reviewId: string; businessId: string; rating: number }) {
    const [biz, owner] = await Promise.all([
      this.getBusiness(data.businessId),
      this.getOwnerByBizId(data.businessId),
    ]);

    if (!owner?.email) return;

    await this.emailService.sendRawMail({
      from:    `Dialbee <${this.config.get('EMAIL_FROM')}>`,
      to:      owner.email,
      subject: `⭐ New ${data.rating}-star review for ${biz?.name}`,
      html:    `<p>You have a new ${data.rating}-star review. <a href="${this.config.get('FRONTEND_URL')}/dashboard/reviews">View and respond</a></p>`,
    });
  }

  private async handleBizCreated(data: { bizId: string; ownerId: string }) {
    const owner = await this.getUser(data.ownerId);
    if (owner?.email) {
      await this.emailService.sendWelcomeEmail(owner.email, owner.full_name);
    }
  }

  private async handleSubActivated(data: { businessId: string; planName: string; expiresAt: string }) {
    const owner = await this.getOwnerByBizId(data.businessId);
    if (owner?.email) {
      await this.emailService.sendSubscriptionEmail(owner.email, data);
    }
  }

  private async handlePaymentFailed(data: { businessId: string; invoiceUrl: string }) {
    const owner = await this.getOwnerByBizId(data.businessId);
    if (owner?.email) {
      await this.emailService.sendRawMail({
        from:    `Dialbee <${this.config.get('EMAIL_FROM')}>`,
        to:      owner.email,
        subject: '⚠️ Payment Failed — Action Required',
        html:    `<p>Your recent payment failed. <a href="${data.invoiceUrl}">Pay now</a> to keep your listing active.</p>`,
      });
    }
  }

  private async handleLowWallet(data: { businessId: string; balance: number }) {
    const owner = await this.getOwnerByBizId(data.businessId);
    if (owner?.email) {
      await this.emailService.sendRawMail({
        from:    `Dialbee <${this.config.get('EMAIL_FROM')}>`,
        to:      owner.email,
        subject: '💳 Low Lead Wallet Balance',
        html:    `<p>Your lead wallet balance is $${data.balance}. <a href="${this.config.get('FRONTEND_URL')}/dashboard/billing/wallet">Top up</a> to keep receiving leads.</p>`,
      });
    }
  }

  // ── DB helpers ─────────────────────────────────────────
  private getLead(id: string) {
    return this.dataSource.query(
      `SELECT l.*, ct.name as city_name, cat.name as category_name
       FROM leads l
       LEFT JOIN cities ct ON ct.id = l.city_id
       LEFT JOIN categories cat ON cat.id = l.category_id
       WHERE l.id = $1`, [id],
    ).then(r => r[0]);
  }

  private getBusiness(id: string) {
    return this.dataSource.query(
      `SELECT b.*, ct.name as city_name, cat.name as category_name
       FROM businesses b
       JOIN cities ct ON ct.id = b.city_id
       JOIN categories cat ON cat.id = b.category_id
       WHERE b.id = $1`, [id],
    ).then(r => r[0]);
  }

  private getUser(id: string) {
    return this.dataSource.query(
      `SELECT id, email, phone, full_name, whatsapp_number FROM users WHERE id = $1`, [id],
    ).then(r => r[0]);
  }

  private getOwnerByBizId(bizId: string) {
    return this.dataSource.query(
      `SELECT u.id, u.email, u.phone, u.full_name, u.whatsapp_number
       FROM users u JOIN businesses b ON b.owner_id = u.id WHERE b.id = $1`, [bizId],
    ).then(r => r[0]);
  }
}

// ── notifications.module.ts ───────────────────────────────────
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  providers: [SmsService, WhatsAppService, EmailService, NotificationsProcessor],
  exports:   [SmsService, WhatsAppService, EmailService],
})
export class NotificationsModule {}
