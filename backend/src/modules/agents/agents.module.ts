// ═══════════════════════════════════════════════════════════════
// SALES AGENT MODULE
// Agent panel: quick-add businesses, commissions, territory
// ═══════════════════════════════════════════════════════════════

// ── agent.entity.ts ───────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn
} from 'typeorm';

@Entity('sales_agents')
export class SalesAgent {
  @PrimaryGeneratedColumn('uuid')    id: string;
  @Column({ name: 'user_id', unique: true }) userId: string;
  @Column({ name: 'agent_code', unique: true }) agentCode: string;
  @Column({ name: 'country_id' })    countryId: string;
  @Column({ name: 'territory_cities', type: 'uuid', array: true, default: [] }) territoryCities: string[];
  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 10 }) commissionRate: number;
  @Column({ name: 'total_earned', type: 'decimal', precision: 12, scale: 2, default: 0 }) totalEarned: number;
  @Column({ name: 'total_businesses', default: 0 }) totalBusinesses: number;
  @Column({ default: 'active' })     status: string;
  @Column({ name: 'target_monthly', default: 20 }) targetMonthly: number;
  @Column({ name: 'manager_id', nullable: true }) managerId: string;
  @CreateDateColumn({ name: 'joined_at' }) joinedAt: Date;
}

// ── DTOs ──────────────────────────────────────────────────────
import { IsString, IsOptional, IsNotEmpty, IsUUID, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuickAddBusinessDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty() @IsUUID() @IsNotEmpty()
  categoryId: string;

  @ApiProperty() @IsUUID() @IsNotEmpty()
  cityId: string;

  @ApiProperty() @IsString() @IsOptional()
  phonePrimary?: string;

  @ApiProperty() @IsString() @IsOptional()
  address?: string;

  @ApiProperty() @IsString() @IsOptional()
  ownerEmail?: string;   // Creates/links business owner account

  @ApiProperty() @IsString() @IsOptional()
  ownerName?: string;

  @ApiProperty() @IsString() @IsOptional()
  selectedPlan?: string; // If agent is selling a paid plan
}

export class UpdateTerritoryDto {
  @IsArray() @IsUUID('4', { each: true })
  cityIds: string[];
}

// ── agents.service.ts ─────────────────────────────────────────
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository }  from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue }       from '@nestjs/bullmq';
import { Queue }             from 'bullmq';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(SalesAgent) private agentRepo: Repository<SalesAgent>,
    @InjectQueue('notifications') private notifQueue: Queue,
    private dataSource: DataSource,
  ) {}

  // ── Agent Dashboard ───────────────────────────────────
  async getDashboard(userId: string) {
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) throw new NotFoundException('Agent profile not found');

    const [bizThisMonth, bizTotal, commissionThisMonth, commissionPending, topBiz] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*) FROM businesses WHERE agent_id = $1 AND created_at >= DATE_TRUNC('month', NOW())`,
        [agent.id],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) FROM businesses WHERE agent_id = $1`, [agent.id],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(commission_amount), 0) FROM payments
         WHERE agent_id = $1 AND created_at >= DATE_TRUNC('month', NOW()) AND status = 'completed'`,
        [agent.id],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(commission_amount), 0) FROM payments
         WHERE agent_id = $1 AND commission_paid = FALSE AND status = 'completed'`,
        [agent.id],
      ),
      this.dataSource.query(
        `SELECT b.id, b.name, b.subscription_tier, b.avg_rating, b.total_leads, b.created_at
         FROM businesses b WHERE b.agent_id = $1
         ORDER BY b.created_at DESC LIMIT 5`,
        [agent.id],
      ),
    ]);

    const targetProgress = Math.min(100, Math.round(
      (parseInt(bizThisMonth[0]?.count ?? '0') / agent.targetMonthly) * 100,
    ));

    return {
      agent: {
        id:           agent.id,
        agentCode:    agent.agentCode,
        commissionRate: agent.commissionRate,
        totalEarned:  agent.totalEarned,
        status:       agent.status,
      },
      thisMonth: {
        businessesAdded: parseInt(bizThisMonth[0]?.count ?? '0'),
        target:          agent.targetMonthly,
        targetProgress,
        commission:      parseFloat(commissionThisMonth[0]?.coalesce ?? '0'),
      },
      total: {
        businessesAdded: parseInt(bizTotal[0]?.count ?? '0'),
        totalEarned:     agent.totalEarned,
        pendingPayout:   parseFloat(commissionPending[0]?.coalesce ?? '0'),
      },
      recentBusinesses: topBiz,
    };
  }

  // ── Quick-add business ────────────────────────────────
  async quickAddBusiness(dto: QuickAddBusinessDto, agentUserId: string): Promise<{ businessId: string; ownerId: string }> {
    const agent = await this.agentRepo.findOne({ where: { userId: agentUserId } });
    if (!agent) throw new NotFoundException('Agent profile not found');

    // Check territory access
    if (agent.territoryCities.length && !agent.territoryCities.includes(dto.cityId)) {
      throw new ForbiddenException('This city is outside your territory');
    }

    // Create or find owner account
    let ownerId = await this.findOrCreateOwner(dto.ownerEmail, dto.ownerName);

    // Generate slug
    const slug = `${dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    // Create business
    const [biz] = await this.dataSource.query(`
      INSERT INTO businesses
        (id, owner_id, agent_id, category_id, city_id, country_id, name, slug,
         phone_primary, address_line1, status, created_at, updated_at)
      SELECT
        gen_random_uuid(), $1, $2, $3, $4, ct.country_id,
        $5, $6, $7, $8, 'pending', NOW(), NOW()
      FROM cities ct WHERE ct.id = $4
      RETURNING id
    `, [ownerId, agent.id, dto.categoryId, dto.cityId, dto.name, slug, dto.phonePrimary, dto.address]);

    // Create default free wallet
    await this.dataSource.query(`
      INSERT INTO lead_wallets (id, business_id, balance, currency_code, updated_at)
      SELECT gen_random_uuid(), $1, 0, co.currency_code, NOW()
      FROM businesses b JOIN countries co ON co.id = b.country_id
      WHERE b.id = $1
      ON CONFLICT (business_id) DO NOTHING
    `, [biz.id]);

    // Update agent stats
    await this.agentRepo.update(agent.id, {
      totalBusinesses: agent.totalBusinesses + 1,
    });

    // Notify new business owner
    await this.notifQueue.add('business-created', { bizId: biz.id, ownerId });

    this.logger.log(`Agent ${agent.agentCode} added business ${biz.id} (${dto.name})`);
    return { businessId: biz.id, ownerId };
  }

  private async findOrCreateOwner(email?: string, name?: string): Promise<string> {
    if (email) {
      const existing = await this.dataSource.query(
        `SELECT id FROM users WHERE email = $1`, [email.toLowerCase()],
      );
      if (existing.length) return existing[0].id;
    }

    // Create a stub account
    const bcrypt  = require('bcrypt');
    const tempPass = await bcrypt.hash(`Dialbee@${Date.now()}`, 10);
    const [user]  = await this.dataSource.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, 'business_owner', NOW(), NOW())
      RETURNING id
    `, [email ?? `agent_created_${Date.now()}@dialbee.com`, tempPass, name ?? 'Business Owner']);

    return user.id;
  }

  // ── My businesses ──────────────────────────────────────
  async getMyBusinesses(agentUserId: string, page = 1, limit = 20) {
    const agent = await this.agentRepo.findOne({ where: { userId: agentUserId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const rows = await this.dataSource.query(`
      SELECT b.id, b.name, b.slug, b.status, b.subscription_tier,
             b.avg_rating, b.total_reviews, b.total_leads, b.created_at,
             ct.name as city_name, cat.name as category_name,
             u.email as owner_email, u.phone as owner_phone
      FROM businesses b
      JOIN cities ct ON ct.id = b.city_id
      JOIN categories cat ON cat.id = b.category_id
      JOIN users u ON u.id = b.owner_id
      WHERE b.agent_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `, [agent.id, limit, (page - 1) * limit]);

    const total = await this.dataSource.query(
      `SELECT COUNT(*) FROM businesses WHERE agent_id = $1`, [agent.id],
    );

    return { data: rows, total: parseInt(total[0]?.count ?? '0'), page, limit };
  }

  // ── Commission history ─────────────────────────────────
  async getCommissions(agentUserId: string, page = 1) {
    const agent = await this.agentRepo.findOne({ where: { userId: agentUserId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const rows = await this.dataSource.query(`
      SELECT p.id, p.amount, p.commission_rate, p.commission_amount,
             p.commission_paid, p.type, p.created_at,
             b.name as business_name, b.id as business_id
      FROM payments p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.agent_id = $1
      ORDER BY p.created_at DESC
      LIMIT 20 OFFSET $2
    `, [agent.id, (page - 1) * 20]);

    const totals = await this.dataSource.query(`
      SELECT
        COALESCE(SUM(commission_amount), 0) as total_earned,
        COALESCE(SUM(CASE WHEN commission_paid = FALSE THEN commission_amount ELSE 0 END), 0) as pending
      FROM payments WHERE agent_id = $1 AND status = 'completed'
    `, [agent.id]);

    return {
      data:         rows,
      totalEarned:  parseFloat(totals[0]?.total_earned ?? '0'),
      pendingPayout:parseFloat(totals[0]?.pending ?? '0'),
      page,
    };
  }

  // ── Territory ──────────────────────────────────────────
  async getTerritory(agentUserId: string) {
    const agent = await this.agentRepo.findOne({ where: { userId: agentUserId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const cities = await this.dataSource.query(`
      SELECT ct.id, ct.name, ct.slug, co.name as country_name, co.flag_emoji,
             COUNT(b.id) as my_businesses,
             COUNT(CASE WHEN b.subscription_tier != 'free' THEN 1 END) as paid_businesses
      FROM cities ct
      JOIN countries co ON co.id = ct.country_id
      LEFT JOIN businesses b ON b.city_id = ct.id AND b.agent_id = $1
      WHERE ct.id = ANY($2)
      GROUP BY ct.id, co.name, co.flag_emoji
      ORDER BY my_businesses DESC
    `, [agent.id, agent.territoryCities.length ? agent.territoryCities : ['no-city']]);

    return { cities, agentCode: agent.agentCode };
  }

  // ── Monthly target tracking ────────────────────────────
  async getTargets(agentUserId: string) {
    const agent = await this.agentRepo.findOne({ where: { userId: agentUserId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const months = await this.dataSource.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
        COUNT(*) as businesses_added,
        COUNT(CASE WHEN subscription_tier != 'free' THEN 1 END) as paid_added
      FROM businesses
      WHERE agent_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
    `, [agent.id]);

    return {
      target:         agent.targetMonthly,
      history:        months,
      commissionRate: agent.commissionRate,
    };
  }
}

// ── agents.controller.ts ───────────────────────────────────────
import {
  Controller, Get, Post, Body, Query,
  UseGuards, Request, Param
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('agents')
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.agentsService.getDashboard(req.user.id);
  }

  @Post('businesses')
  quickAdd(@Body() dto: QuickAddBusinessDto, @Request() req: any) {
    return this.agentsService.quickAddBusiness(dto, req.user.id);
  }

  @Get('businesses')
  getMyBusinesses(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.agentsService.getMyBusinesses(req.user.id, +page, +limit);
  }

  @Get('commissions')
  getCommissions(@Request() req: any, @Query('page') page = 1) {
    return this.agentsService.getCommissions(req.user.id, +page);
  }

  @Get('territory')
  getTerritory(@Request() req: any) {
    return this.agentsService.getTerritory(req.user.id);
  }

  @Get('targets')
  getTargets(@Request() req: any) {
    return this.agentsService.getTargets(req.user.id);
  }
}

// ── agents.module.ts ──────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesAgent]),
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [AgentsController],
  providers:   [AgentsService],
  exports:     [AgentsService],
})
export class AgentsModule {}
