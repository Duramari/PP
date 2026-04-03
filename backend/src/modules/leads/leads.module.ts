// ═══════════════════════════════════════════════════════════════
// LEADS MODULE — Complete Lead Generation System
// Multi-vendor distribution + quality scoring + wallet deduction
// ═══════════════════════════════════════════════════════════════

// ── lead.entity.ts ────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index
} from 'typeorm';

export enum LeadStatus { NEW='new', DISTRIBUTED='distributed', CONTACTED='contacted', CONVERTED='converted', LOST='lost', SPAM='spam' }
export enum LeadSource { FORM='form', CALL='call', WHATSAPP='whatsapp', CHAT='chat' }
export enum Urgency    { URGENT='urgent', NORMAL='normal', FLEXIBLE='flexible' }

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')  id: string;

  @Column({ name: 'customer_name', nullable: true })   customerName: string;
  @Index() @Column({ name: 'customer_phone', nullable: true }) customerPhone: string;
  @Column({ name: 'customer_email', nullable: true })  customerEmail: string;
  @Column({ name: 'customer_message', type: 'text', nullable: true }) customerMessage: string;

  @Column({ name: 'category_id', nullable: true })     categoryId: string;
  @Column({ name: 'city_id', nullable: true })         cityId: string;
  @Column({ name: 'country_code', nullable: true })    countryCode: string;
  @Column({ name: 'service_required', nullable: true }) serviceRequired: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) budgetMin: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) budgetMax: number;
  @Column({ name: 'budget_currency', nullable: true }) budgetCurrency: string;

  @Column({ type: 'enum', enum: Urgency, default: Urgency.NORMAL }) urgency: Urgency;
  @Column({ type: 'enum', enum: LeadSource, default: LeadSource.FORM }) source: LeadSource;
  @Column({ name: 'source_url', nullable: true })      sourceUrl: string;
  @Column({ name: 'search_query', nullable: true })    searchQuery: string;
  @Column({ name: 'utm_source', nullable: true })      utmSource: string;
  @Column({ name: 'utm_campaign', nullable: true })    utmCampaign: string;
  @Column({ name: 'session_id', nullable: true })      sessionId: string;
  @Column({ name: 'ip_address', type: 'inet', nullable: true }) ipAddress: string;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW }) status: LeadStatus;
  @Column({ name: 'distributed_to', default: 0 })       distributedTo: number;
  @Column({ name: 'max_vendors', default: 3 })           maxVendors: number;

  @Column({ name: 'quality_score', type: 'decimal', precision: 4, scale: 3, default: 0.5 }) qualityScore: number;
  @Column({ name: 'is_duplicate', default: false })      isDuplicate: boolean;
  @Column({ name: 'is_spam', default: false })           isSpam: boolean;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @Column({ name: 'expires_at', nullable: true })        expiresAt: Date;
}

@Entity('lead_distributions')
export class LeadDistribution {
  @PrimaryGeneratedColumn('uuid')  id: string;
  @Column({ name: 'lead_id' })     leadId: string;
  @Column({ name: 'business_id' }) businessId: string;

  @Column({ name: 'cost_charged', type: 'decimal', precision: 10, scale: 2, default: 0 }) costCharged: number;
  @Column({ name: 'currency_code', nullable: true }) currencyCode: string;
  @Column({ name: 'is_billed', default: false })     isBilled: boolean;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW }) status: LeadStatus;
  @Column({ name: 'notified_at', nullable: true })   notifiedAt: Date;
  @Column({ name: 'viewed_at', nullable: true })     viewedAt: Date;
  @Column({ name: 'responded_at', nullable: true })  respondedAt: Date;
  @Column({ name: 'converted_at', nullable: true })  convertedAt: Date;

  @Column({ name: 'priority_score', type: 'decimal', precision: 6, scale: 3, default: 0 }) priorityScore: number;
  @Column({ default: 0 })                            position: number;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('lead_wallets')
export class LeadWallet {
  @PrimaryGeneratedColumn('uuid')  id: string;
  @Column({ name: 'business_id', unique: true }) businessId: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) balance: number;
  @Column({ name: 'currency_code' }) currencyCode: string;
  @Column({ name: 'total_topped_up', type: 'decimal', precision: 12, scale: 2, default: 0 }) totalToppedUp: number;
  @Column({ name: 'total_spent', type: 'decimal', precision: 12, scale: 2, default: 0 })    totalSpent: number;
  @Column({ name: 'updated_at' }) updatedAt: Date;
}

// ── create-lead.dto.ts ────────────────────────────────────────
import { IsString, IsOptional, IsEmail, IsEnum, IsNumber, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty() @IsUUID() @IsNotEmpty()
  businessId: string;

  @ApiProperty() @IsString() @IsOptional()
  customerName?: string;

  @ApiProperty({ example: '+2348012345678' }) @IsString() @IsOptional()
  customerPhone?: string;

  @ApiProperty() @IsEmail() @IsOptional()
  customerEmail?: string;

  @ApiProperty() @IsString() @IsOptional()
  customerMessage?: string;

  @ApiProperty({ enum: LeadSource }) @IsEnum(LeadSource)
  source: LeadSource = LeadSource.FORM;

  @ApiProperty({ enum: Urgency }) @IsEnum(Urgency) @IsOptional()
  urgency?: Urgency;

  @ApiProperty() @IsString() @IsOptional()
  searchQuery?: string;

  @ApiProperty() @IsNumber() @IsOptional()
  budgetMin?: number;

  @ApiProperty() @IsNumber() @IsOptional()
  budgetMax?: number;
}

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;
}

// ── leads.service.ts ──────────────────────────────────────────
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository }  from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { InjectQueue }       from '@nestjs/bullmq';
import { Queue }             from 'bullmq';
import { InjectRedis }       from '@nestjs-modules/ioredis';
import { Redis }             from 'ioredis';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead)             private leadRepo: Repository<Lead>,
    @InjectRepository(LeadDistribution) private distRepo: Repository<LeadDistribution>,
    @InjectRepository(LeadWallet)       private walletRepo: Repository<LeadWallet>,
    @InjectQueue('lead-process')        private leadQueue: Queue,
    @InjectQueue('notifications')       private notifQueue: Queue,
    @InjectRedis() private redis: Redis,
    private dataSource: DataSource,
  ) {}

  // ── Submit Lead ──────────────────────────────────────────────
  async submitLead(dto: CreateLeadDto, meta: LeadMeta): Promise<Lead> {
    // 1. Rate-limit per IP
    const ipKey = `lead_ip:${meta.ip}`;
    const count = parseInt(await this.redis.incr(ipKey) as any);
    if (count === 1) await this.redis.expire(ipKey, 3600);
    if (count > 5) throw new BadRequestException('Too many requests. Please wait.');

    // 2. Check duplicate (same phone + same business in 24h)
    const isDuplicate = await this.checkDuplicate(dto.businessId, dto.customerPhone);

    // 3. Score lead quality
    const qualityScore = this.scoreLead(dto, meta, count);

    // 4. Create lead
    const lead = this.leadRepo.create({
      customerName:    dto.customerName,
      customerPhone:   dto.customerPhone,
      customerEmail:   dto.customerEmail,
      customerMessage: dto.customerMessage,
      source:          dto.source,
      urgency:         dto.urgency ?? Urgency.NORMAL,
      searchQuery:     dto.searchQuery,
      budgetMin:       dto.budgetMin,
      budgetMax:       dto.budgetMax,
      sessionId:       meta.sessionId,
      ipAddress:       meta.ip,
      isDuplicate,
      qualityScore,
      expiresAt:       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const saved = await this.leadRepo.save(lead);

    // 5. Queue distribution (async)
    await this.leadQueue.add('distribute', {
      leadId:     saved.id,
      businessId: dto.businessId,
      categoryId: meta.categoryId,
      cityId:     meta.cityId,
    }, {
      priority: dto.urgency === Urgency.URGENT ? 1 : 5,
      delay:    0,
    });

    this.logger.log(`Lead ${saved.id} created | quality=${qualityScore.toFixed(2)} | duplicate=${isDuplicate}`);
    return saved;
  }

  // ── Distribute Lead to Businesses ───────────────────────────
  async distributeLead(leadId: string, primaryBusinessId: string, categoryId: string, cityId: string): Promise<void> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!lead || lead.status !== LeadStatus.NEW) return;

    // Find eligible businesses (same category + city, active, wallet > 0)
    const candidates = await this.findEligibleBusinesses(categoryId, cityId, primaryBusinessId);
    if (!candidates.length) {
      this.logger.warn(`No eligible businesses for lead ${leadId}`);
      return;
    }

    // Score and rank
    const ranked = this.rankBusinesses(candidates);
    const selected = ranked.slice(0, lead.maxVendors);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const leadCostPerBiz = 5.00; // Will come from category.lead_cost_usd in Phase 2

      for (let i = 0; i < selected.length; i++) {
        const biz = selected[i];

        // Deduct wallet
        await qr.query(
          `UPDATE lead_wallets
           SET balance = balance - $1, total_spent = total_spent + $1, updated_at = NOW()
           WHERE business_id = $2 AND balance >= $1`,
          [leadCostPerBiz, biz.id],
        );

        // Create distribution record
        await qr.query(
          `INSERT INTO lead_distributions
           (id, lead_id, business_id, cost_charged, currency_code, is_billed, status, priority_score, position, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'USD', true, 'new', $4, $5, NOW())
           ON CONFLICT (lead_id, business_id) DO NOTHING`,
          [leadId, biz.id, leadCostPerBiz, biz._score, i + 1],
        );
      }

      // Update lead status
      await qr.query(
        `UPDATE leads SET status = 'distributed', distributed_to = $1 WHERE id = $2`,
        [selected.length, leadId],
      );

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      this.logger.error(`Distribution failed for ${leadId}`, err);
      throw err;
    } finally {
      await qr.release();
    }

    // Queue notifications for each business (outside transaction)
    for (const biz of selected) {
      await this.notifQueue.add('new-lead', {
        leadId, businessId: biz.id,
        ownerId: biz.ownerId,
      }, { priority: 1 });
    }

    this.logger.log(`Lead ${leadId} → distributed to ${selected.length} businesses`);
  }

  // ── Business: get lead inbox ─────────────────────────────────
  async getBusinessLeads(bizId: string, ownerId: string, page = 1, limit = 20, status?: string) {
    // Verify ownership
    const biz = await this.dataSource.query(
      `SELECT id, subscription_tier, owner_id FROM businesses WHERE id = $1 AND owner_id = $2`,
      [bizId, ownerId],
    );
    if (!biz.length) throw new Error('Business not found');

    const canSeeContacts = ['standard', 'premium', 'enterprise'].includes(biz[0].subscription_tier);

    let query = `
      SELECT
        ld.id as dist_id, ld.status, ld.cost_charged, ld.viewed_at, ld.responded_at,
        ld.created_at,
        l.id as lead_id, l.customer_name, l.customer_message, l.source, l.urgency,
        l.quality_score, l.search_query, l.budget_min, l.budget_max,
        CASE WHEN $3 THEN l.customer_phone ELSE REGEXP_REPLACE(l.customer_phone, '\\d(?=\\d{4})', '*', 'g') END as customer_phone,
        CASE WHEN $3 THEN l.customer_email ELSE CONCAT(LEFT(SPLIT_PART(l.customer_email,'@',1),2), '***@', SPLIT_PART(l.customer_email,'@',2)) END as customer_email,
        l.created_at as lead_created_at
      FROM lead_distributions ld
      JOIN leads l ON l.id = ld.lead_id
      WHERE ld.business_id = $1
    `;

    const params: any[] = [bizId, (page - 1) * limit, canSeeContacts];
    if (status) { query += ` AND ld.status = $${params.length + 1}`; params.push(status); }

    query += ` ORDER BY ld.created_at DESC LIMIT ${limit} OFFSET $2`;

    const leads = await this.dataSource.query(query, params);

    // Mark as viewed
    await this.dataSource.query(
      `UPDATE lead_distributions SET viewed_at = NOW()
       WHERE business_id = $1 AND viewed_at IS NULL`,
      [bizId],
    );

    return {
      leads,
      canSeeContacts,
      upgradeMessage: !canSeeContacts ? 'Upgrade to Standard to see contact details' : null,
    };
  }

  // ── Update lead status ───────────────────────────────────────
  async updateLeadStatus(distId: string, bizId: string, status: LeadStatus): Promise<void> {
    await this.distRepo.update(
      { id: distId, businessId: bizId },
      {
        status,
        ...(status === LeadStatus.CONTACTED  ? { respondedAt: new Date() } : {}),
        ...(status === LeadStatus.CONVERTED  ? { convertedAt: new Date() } : {}),
      },
    );
  }

  // ── Wallet balance ───────────────────────────────────────────
  async getWalletBalance(bizId: string): Promise<{ balance: number; currency: string }> {
    const row = await this.walletRepo.findOne({ where: { businessId: bizId } });
    return { balance: row?.balance ?? 0, currency: row?.currencyCode ?? 'USD' };
  }

  async createWallet(bizId: string, currency: string): Promise<void> {
    await this.walletRepo.save(
      this.walletRepo.create({ businessId: bizId, currencyCode: currency, updatedAt: new Date() }),
    );
  }

  // ── Helpers ──────────────────────────────────────────────────
  private async checkDuplicate(bizId: string, phone?: string): Promise<boolean> {
    if (!phone) return false;
    const recent = await this.distRepo
      .createQueryBuilder('ld')
      .innerJoin('ld.lead', 'l')
      .where('ld.businessId = :biz', { biz: bizId })
      .andWhere('l.customerPhone = :phone', { phone })
      .andWhere('ld.createdAt > NOW() - INTERVAL \'24 hours\'')
      .getCount();
    return recent > 0;
  }

  private scoreLead(dto: CreateLeadDto, meta: LeadMeta, sameIpCount: number): number {
    let score = 0.50;
    if (dto.customerPhone)                        score += 0.15;
    if (dto.customerEmail)                        score += 0.05;
    if (dto.customerMessage?.length ?? 0 > 20)   score += 0.08;
    if (dto.customerMessage?.length ?? 0 > 100)  score += 0.07;
    if (dto.customerName)                         score += 0.05;
    if (dto.urgency === Urgency.URGENT)           score += 0.10;
    if (dto.source === LeadSource.CALL)           score += 0.15;
    if (dto.source === LeadSource.WHATSAPP)       score += 0.12;
    if (dto.budgetMax && dto.budgetMax > 0)       score += 0.05;
    if (sameIpCount > 2) score -= 0.15 * (sameIpCount - 1);
    return Math.max(0, Math.min(1, parseFloat(score.toFixed(3))));
  }

  private async findEligibleBusinesses(categoryId: string, cityId: string, primaryId: string) {
    return this.dataSource.query(`
      SELECT b.id, b.owner_id, b.name, b.subscription_tier,
             b.avg_rating, b.response_rate, b.avg_response_time_hrs,
             COALESCE(lw.balance, 0) as wallet_balance
      FROM businesses b
      LEFT JOIN lead_wallets lw ON lw.business_id = b.id
      WHERE b.category_id = $1
        AND b.city_id = $2
        AND b.status = 'active'
        AND b.is_active = TRUE
        AND (b.id = $3 OR COALESCE(lw.balance, 0) >= 5)
      ORDER BY b.subscription_tier DESC, b.avg_rating DESC
      LIMIT 20
    `, [categoryId, cityId, primaryId]);
  }

  private rankBusinesses(candidates: any[]): any[] {
    const tierW = { enterprise: 4, premium: 3, standard: 1.5, free: 1 };
    return candidates
      .map(b => ({
        ...b,
        _score:
          (tierW[b.subscription_tier] ?? 1) +
          ((b.avg_rating / 5) * 2) +
          ((b.response_rate / 100) * 1.5) +
          (Math.random() * 0.1),
      }))
      .sort((a, b) => b._score - a._score);
  }
}

interface LeadMeta {
  ip: string;
  sessionId: string;
  userAgent?: string;
  categoryId?: string;
  cityId?: string;
  referer?: string;
}

// ── lead.processor.ts (BullMQ Worker) ────────────────────────
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('lead-process')
export class LeadProcessor extends WorkerHost {
  constructor(private leadsService: LeadsService) { super(); }

  async process(job: Job): Promise<void> {
    if (job.name === 'distribute') {
      const { leadId, businessId, categoryId, cityId } = job.data;
      await this.leadsService.distributeLead(leadId, businessId, categoryId, cityId);
    }
  }
}

// ── leads.controller.ts ───────────────────────────────────────
import {
  Controller, Post, Get, Patch, Body, Param,
  Query, UseGuards, Request, Ip, Headers
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('leads')
@Controller()
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post('leads')
  @Throttle({ medium: { limit: 5, ttl: 60000 } })
  submitLead(
    @Body() dto: CreateLeadDto,
    @Ip() ip: string,
    @Headers('x-session-id') sessionId: string,
    @Headers('referer') referer: string,
  ) {
    return this.leadsService.submitLead(dto, {
      ip: ip ?? '0.0.0.0',
      sessionId: sessionId ?? 'anon',
      referer,
    });
  }

  @Get('owner/businesses/:id/leads')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  getLeads(
    @Param('id') id: string,
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.leadsService.getBusinessLeads(id, req.user.id, +page, +limit, status);
  }

  @Patch('owner/leads/:id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @Request() req: any,
  ) {
    return this.leadsService.updateLeadStatus(id, req.user.id, dto.status);
  }

  @Get('owner/businesses/:id/wallet')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  getWallet(@Param('id') id: string, @Request() req: any) {
    return this.leadsService.getWalletBalance(id);
  }
}

// ── leads.module.ts ───────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, LeadDistribution, LeadWallet]),
    BullModule.registerQueue({ name: 'lead-process' }, { name: 'notifications' }),
  ],
  controllers: [LeadsController],
  providers:   [LeadsService, LeadProcessor],
  exports:     [LeadsService],
})
export class LeadsModule {}
