// ═══════════════════════════════════════════════════════════════
// ADMIN MODULE — Business approval, revenue, user management
// ═══════════════════════════════════════════════════════════════

import {
  Injectable, NotFoundException, ForbiddenException, Logger
} from '@nestjs/common';
import {
  Controller, Get, Patch, Delete, Body, Param, Query,
  UseGuards, Request
} from '@nestjs/common';
import { InjectRepository }  from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ── DTOs ──────────────────────────────────────────────────────
class ApproveBizDto {
  @IsEnum(['approve', 'reject', 'suspend'])
  action: 'approve' | 'reject' | 'suspend';

  @IsString() @IsOptional()
  reason?: string;
}

// ── Admin Service ─────────────────────────────────────────────
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private dataSource: DataSource,
  ) {}

  // ── Revenue Dashboard ─────────────────────────────────────
  async getDashboard() {
    const [
      revenueToday, revenueMonth, totalBiz, pendingBiz,
      totalLeads, leadsToday, totalUsers, newUsersWeek,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments
         WHERE status = 'completed' AND created_at >= CURRENT_DATE`
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments
         WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW())`
      ),
      this.dataSource.query(`SELECT COUNT(*) FROM businesses WHERE is_active = TRUE`),
      this.dataSource.query(`SELECT COUNT(*) FROM businesses WHERE status = 'pending'`),
      this.dataSource.query(`SELECT COUNT(*) FROM leads`),
      this.dataSource.query(`SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE`),
      this.dataSource.query(`SELECT COUNT(*) FROM users WHERE is_active = TRUE`),
      this.dataSource.query(
        `SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`
      ),
    ]);

    // Revenue by country
    const revenueByCountry = await this.dataSource.query(`
      SELECT c.code, c.name, c.flag_emoji,
             COALESCE(SUM(p.amount), 0) as revenue,
             COUNT(DISTINCT b.id) as businesses
      FROM countries c
      LEFT JOIN businesses b ON b.country_id = c.id
      LEFT JOIN payments p ON p.business_id = b.id AND p.status = 'completed'
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY revenue DESC
    `);

    // Revenue breakdown by type
    const revenueByType = await this.dataSource.query(`
      SELECT type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM payments
      WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW())
      GROUP BY type
      ORDER BY total DESC
    `);

    // Tier breakdown
    const bizByTier = await this.dataSource.query(`
      SELECT subscription_tier, COUNT(*) as count
      FROM businesses WHERE is_active = TRUE
      GROUP BY subscription_tier
    `);

    return {
      revenue: {
        today: parseFloat(revenueToday[0]?.total ?? '0'),
        thisMonth: parseFloat(revenueMonth[0]?.total ?? '0'),
        byCountry: revenueByCountry,
        byType: revenueByType,
      },
      businesses: {
        total: parseInt(totalBiz[0]?.count ?? '0'),
        pending: parseInt(pendingBiz[0]?.count ?? '0'),
        byTier: bizByTier,
      },
      leads: {
        total: parseInt(totalLeads[0]?.count ?? '0'),
        today: parseInt(leadsToday[0]?.count ?? '0'),
      },
      users: {
        total: parseInt(totalUsers[0]?.count ?? '0'),
        newThisWeek: parseInt(newUsersWeek[0]?.count ?? '0'),
      },
    };
  }

  // ── Business Management ───────────────────────────────────
  async getBusinesses(filters: {
    status?: string; tier?: string; countryCode?: string;
    search?: string; page?: number; limit?: number;
  }) {
    let q = `
      SELECT b.id, b.name, b.slug, b.status, b.subscription_tier,
             b.avg_rating, b.total_reviews, b.total_leads,
             b.verification_status, b.is_active, b.created_at,
             c.name as category_name, ct.name as city_name,
             co.code as country_code, co.name as country_name,
             u.full_name as owner_name, u.email as owner_email
      FROM businesses b
      JOIN categories c  ON c.id = b.category_id
      JOIN cities ct     ON ct.id = b.city_id
      JOIN countries co  ON co.id = b.country_id
      JOIN users u       ON u.id = b.owner_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.status) {
      params.push(filters.status);
      q += ` AND b.status = $${params.length}`;
    }
    if (filters.tier) {
      params.push(filters.tier);
      q += ` AND b.subscription_tier = $${params.length}`;
    }
    if (filters.countryCode) {
      params.push(filters.countryCode);
      q += ` AND co.code = $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      q += ` AND (b.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) FROM (${q}) x`, params
    );
    const total = parseInt(countResult[0]?.count ?? '0');

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    params.push(limit, (page - 1) * limit);
    q += ` ORDER BY b.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const data = await this.dataSource.query(q, params);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Approve / Reject / Suspend Business ──────────────────
  async moderateBusiness(bizId: string, dto: ApproveBizDto, adminId: string) {
    const biz = await this.dataSource.query(
      `SELECT id, status, name FROM businesses WHERE id = $1`, [bizId]
    );
    if (!biz.length) throw new NotFoundException('Business not found');

    let newStatus: string;
    switch (dto.action) {
      case 'approve':  newStatus = 'active';    break;
      case 'reject':   newStatus = 'rejected';  break;
      case 'suspend':  newStatus = 'suspended'; break;
    }

    await this.dataSource.query(
      `UPDATE businesses
       SET status = $1, approved_at = CASE WHEN $1 = 'active' THEN NOW() ELSE NULL END,
           approved_by = $2, updated_at = NOW()
       WHERE id = $3`,
      [newStatus, adminId, bizId],
    );

    // Log admin action
    await this.dataSource.query(
      `INSERT INTO admin_logs (id, admin_id, action, entity_type, entity_id, new_value, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'business', $3, $4, NOW())`,
      [adminId, `business_${dto.action}`, bizId, JSON.stringify({ status: newStatus, reason: dto.reason })],
    );

    this.logger.log(`Admin ${adminId} → ${dto.action} business ${bizId}`);
    return { message: `Business ${dto.action}d successfully` };
  }

  // ── Users Management ──────────────────────────────────────
  async getUsers(page = 1, limit = 20, role?: string, search?: string) {
    let q = `
      SELECT u.id, u.full_name, u.email, u.phone, u.role,
             u.is_active, u.email_verified, u.last_login_at, u.created_at,
             co.name as country_name, co.code as country_code,
             COUNT(b.id) as businesses_count
      FROM users u
      LEFT JOIN countries co ON co.code = u.country_code
      LEFT JOIN businesses b ON b.owner_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role)   { params.push(role);   q += ` AND u.role = $${params.length}`; }
    if (search) { params.push(`%${search}%`); q += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`; }

    q += ` GROUP BY u.id, co.name, co.code ORDER BY u.created_at DESC`;

    const countQ = await this.dataSource.query(`SELECT COUNT(*) FROM (${q}) x`, params);
    const total  = parseInt(countQ[0]?.count ?? '0');

    params.push(limit, (page - 1) * limit);
    q += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const data = await this.dataSource.query(q, params);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async suspendUser(userId: string, adminId: string) {
    await this.dataSource.query(
      `UPDATE users SET is_active = FALSE WHERE id = $1`, [userId]
    );
    await this.dataSource.query(
      `INSERT INTO admin_logs (id, admin_id, action, entity_type, entity_id, created_at)
       VALUES (gen_random_uuid(), $1, 'user_suspend', 'user', $2, NOW())`,
      [adminId, userId],
    );
    return { message: 'User suspended' };
  }

  // ── Reviews Moderation ────────────────────────────────────
  async getReviews(page = 1, limit = 20, flagged = false) {
    const q = `
      SELECT r.id, r.rating, r.title, r.body, r.fraud_score,
             r.is_flagged, r.is_approved, r.created_at,
             b.name as business_name, b.id as business_id,
             u.full_name as reviewer_name, u.email as reviewer_email
      FROM reviews r
      JOIN businesses b ON b.id = r.business_id
      JOIN users u      ON u.id = r.reviewer_id
      ${flagged ? 'WHERE r.is_flagged = TRUE' : ''}
      ORDER BY r.fraud_score DESC, r.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    return this.dataSource.query(q, [limit, (page - 1) * limit]);
  }

  async moderateReview(reviewId: string, approve: boolean, adminId: string) {
    await this.dataSource.query(
      `UPDATE reviews SET is_approved = $1, is_flagged = FALSE WHERE id = $2`,
      [approve, reviewId],
    );
    return { message: `Review ${approve ? 'approved' : 'rejected'}` };
  }

  // ── Leads Overview ────────────────────────────────────────
  async getLeads(page = 1, limit = 20) {
    return this.dataSource.query(`
      SELECT l.id, l.customer_name, l.customer_phone, l.source,
             l.status, l.quality_score, l.distributed_to, l.created_at,
             ct.name as city_name, cat.name as category_name,
             co.code as country_code
      FROM leads l
      LEFT JOIN cities ct      ON ct.id = l.city_id
      LEFT JOIN categories cat ON cat.id = l.category_id
      LEFT JOIN countries co   ON co.code = l.country_code
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, (page - 1) * limit]);
  }

  // ── Payments Overview ─────────────────────────────────────
  async getPayments(page = 1, limit = 20) {
    return this.dataSource.query(`
      SELECT p.id, p.amount, p.currency_code, p.type, p.status,
             p.provider, p.created_at,
             b.name as business_name, b.id as business_id,
             u.full_name as owner_name
      FROM payments p
      LEFT JOIN businesses b ON b.id = p.business_id
      LEFT JOIN users u      ON u.id = b.owner_id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, (page - 1) * limit]);
  }
}

// ── admin.controller.ts ───────────────────────────────────────
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin revenue + metrics dashboard' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('businesses')
  @ApiOperation({ summary: 'List all businesses with filters' })
  getBusinesses(
    @Query('status') status?: string,
    @Query('tier') tier?: string,
    @Query('country') countryCode?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.getBusinesses({ status, tier, countryCode, search, page: +page, limit: +limit });
  }

  @Patch('businesses/:id')
  @ApiOperation({ summary: 'Approve / Reject / Suspend business' })
  moderateBusiness(
    @Param('id') id: string,
    @Body() dto: ApproveBizDto,
    @Request() req: any,
  ) {
    return this.adminService.moderateBusiness(id, dto, req.user.id);
  }

  @Get('users')
  getUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.getUsers(+page, +limit, role, search);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string, @Request() req: any) {
    return this.adminService.suspendUser(id, req.user.id);
  }

  @Get('reviews')
  getReviews(
    @Query('flagged') flagged = 'false',
    @Query('page') page = 1,
  ) {
    return this.adminService.getReviews(+page, 20, flagged === 'true');
  }

  @Patch('reviews/:id')
  moderateReview(
    @Param('id') id: string,
    @Body('approve') approve: boolean,
    @Request() req: any,
  ) {
    return this.adminService.moderateReview(id, approve, req.user.id);
  }

  @Get('leads')
  getLeads(@Query('page') page = 1) {
    return this.adminService.getLeads(+page);
  }

  @Get('payments')
  getPayments(@Query('page') page = 1) {
    return this.adminService.getPayments(+page);
  }
}

// ── admin.module.ts ───────────────────────────────────────────
@Module({
  imports: [],
  controllers: [AdminController],
  providers:   [AdminService],
})
export class AdminModule {}
