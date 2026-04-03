// ═══════════════════════════════════════════════════════════════
// REVIEWS MODULE — With AI Fraud Detection
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, Module, Controller, Post, Get, Body, Param, Query, UseGuards, Request, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min, Max, MaxLength, IsInt, MinLength } from 'class-validator';
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, Unique
} from 'typeorm';

// ── review.entity.ts ──────────────────────────────────────────

@Entity('reviews')
@Unique(['businessId', 'reviewerId'])
export class Review {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index() @Column({ name: 'business_id' }) businessId: string;
  @Column({ name: 'reviewer_id' })           reviewerId: string;
  @Column({ name: 'lead_id', nullable: true }) leadId: string;

  @Column({ type: 'smallint' })      rating: number;
  @Column({ nullable: true })        title: string;
  @Column({ type: 'text' })          body: string;

  @Column({ name: 'rating_quality',   type: 'smallint', nullable: true }) ratingQuality: number;
  @Column({ name: 'rating_timeliness',type: 'smallint', nullable: true }) ratingTimeliness: number;
  @Column({ name: 'rating_value',     type: 'smallint', nullable: true }) ratingValue: number;

  // AI Fraud
  @Column({ name: 'fraud_score', type: 'decimal', precision: 4, scale: 3, default: 0 }) fraudScore: number;
  @Column({ name: 'fraud_flags', type: 'text', array: true, default: [] })               fraudFlags: string[];
  @Column({ name: 'is_flagged', default: false })   isFlagged: boolean;
  @Column({ name: 'is_approved', default: true })   isApproved: boolean;
  @Column({ name: 'is_verified_customer', default: false }) isVerifiedCustomer: boolean;

  @Column({ name: 'helpful_count', default: 0 })   helpfulCount: number;
  @Column({ name: 'reported_count', default: 0 })  reportedCount: number;

  @Column({ name: 'owner_reply', type: 'text', nullable: true })  ownerReply: string;
  @Column({ name: 'owner_replied_at', nullable: true })           ownerRepliedAt: Date;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })   ipAddress: string;
  @Column({ name: 'device_type', nullable: true })                deviceType: string;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

// ── create-review.dto.ts ─────────────────────────────────────

export class CreateReviewDto {
  @ApiProperty() @IsUUID() @IsNotEmpty()
  businessId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiProperty() @IsString() @IsOptional() @MaxLength(255)
  title?: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MinLength(10) @MaxLength(2000)
  body: string;

  @IsInt() @Min(1) @Max(5) @IsOptional() ratingQuality?: number;
  @IsInt() @Min(1) @Max(5) @IsOptional() ratingTimeliness?: number;
  @IsInt() @Min(1) @Max(5) @IsOptional() ratingValue?: number;
}

export class ReplyReviewDto {
  @IsString() @IsNotEmpty() @MaxLength(1000)
  reply: string;
}

// ── fraud-detection.service.ts ───────────────────────────────

interface FraudContext {
  accountAgeDays:      number;
  totalReviewsEver:    number;
  reviewsSameDay:      number;
  sameIpAsBusiness:    boolean;
  sameDeviceAsBusiness:boolean;
  timeToWriteSeconds:  number;
  reviewerCountryCode: string;
  businessCountryCode: string;
  hasPreviousLead:     boolean;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(private dataSource: DataSource) {}

  async analyzeReview(
    reviewData: { rating: number; body: string; reviewerId: string; businessId: string },
    meta: { ip: string; userAgent: string; timeToWriteMs: number },
  ): Promise<{ score: number; flags: string[]; shouldFlag: boolean; shouldReject: boolean }> {
    let score  = 0;
    const flags: string[] = [];

    // ── 1. Gather context from DB ───────────────────────
    const ctx = await this.gatherContext(reviewData.reviewerId, reviewData.businessId, meta.ip);

    // ── 2. Account signals ──────────────────────────────
    if (ctx.accountAgeDays < 1) {
      score += 0.35; flags.push('account_too_new');
    } else if (ctx.accountAgeDays < 7) {
      score += 0.15; flags.push('account_very_new');
    }

    if (ctx.totalReviewsEver === 0) {
      score += 0.10; flags.push('first_ever_review');
    }

    if (ctx.reviewsSameDay >= 3) {
      score += 0.25; flags.push('burst_reviews');
    }

    // ── 3. Relationship signals (HIGH WEIGHT) ───────────
    if (ctx.sameIpAsBusiness) {
      score += 0.60; flags.push('same_ip_as_business');
    }

    if (!ctx.hasPreviousLead && reviewData.rating === 5) {
      score += 0.10; flags.push('no_prior_contact_5star');
    }

    // ── 4. Text analysis ────────────────────────────────
    const textScore = this.analyzeText(reviewData.body, reviewData.rating);
    score += textScore.score;
    flags.push(...textScore.flags);

    // ── 5. Behavioral signals ────────────────────────────
    const timeToWriteSec = meta.timeToWriteMs / 1000;
    if (timeToWriteSec < 15) {
      score += 0.25; flags.push('wrote_too_fast_bot');
    } else if (timeToWriteSec < 30) {
      score += 0.12; flags.push('wrote_fast');
    }

    // ── 6. Cross-country anomaly ──────────────────────────
    if (ctx.reviewerCountryCode && ctx.businessCountryCode &&
        ctx.reviewerCountryCode !== ctx.businessCountryCode) {
      score += 0.08; flags.push('cross_country_review');
    }

    const finalScore    = Math.min(1, parseFloat(score.toFixed(3)));
    const shouldFlag    = finalScore >= 0.40;
    const shouldReject  = finalScore >= 0.80;

    if (shouldFlag) {
      this.logger.warn(`Review flagged: score=${finalScore}, flags=${flags.join(',')}`);
    }

    return { score: finalScore, flags, shouldFlag, shouldReject };
  }

  private analyzeText(body: string, rating: number): { score: number; flags: string[] } {
    let score  = 0;
    const flags: string[] = [];
    const text = body.toLowerCase().trim();

    // Too short
    if (text.length < 15) {
      score += 0.15; flags.push('review_too_short');
    }

    // Generic phrases (bot indicators)
    const genericPhrases = [
      'great service', 'highly recommend', 'very good service',
      'excellent service', 'best in town', 'five stars',
      'good job', 'well done', 'nice work',
    ];
    const genericCount = genericPhrases.filter(p => text.includes(p)).length;
    if (genericCount >= 2) {
      score += 0.15; flags.push('generic_text');
    }

    // Sentiment vs rating mismatch
    const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'horrible', 'never again', 'scam', 'fraud'];
    const hasNegative   = negativeWords.some(w => text.includes(w));
    if (rating === 5 && hasNegative) {
      score += 0.20; flags.push('sentiment_rating_mismatch');
    }

    // All caps (angry spam indicator)
    const upperRatio = (body.match(/[A-Z]/g)?.length ?? 0) / body.length;
    if (upperRatio > 0.5 && body.length > 20) {
      score += 0.10; flags.push('excessive_caps');
    }

    return { score, flags };
  }

  private async gatherContext(reviewerId: string, bizId: string, ip: string): Promise<FraudContext> {
    const [userRow, reviewCount, sameDayReviews, bizIpRows, leadRows] = await Promise.all([
      this.dataSource.query(
        `SELECT EXTRACT(DAY FROM NOW() - created_at) as age_days, country_code
         FROM users WHERE id = $1`, [reviewerId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) FROM reviews WHERE reviewer_id = $1`, [reviewerId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) FROM reviews
         WHERE reviewer_id = $1 AND created_at >= CURRENT_DATE`, [reviewerId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) FROM users
         WHERE id = $1 AND metadata->>'last_ip' = $2`, [bizId, ip],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) FROM leads l
         JOIN lead_distributions ld ON ld.lead_id = l.id
         WHERE l.customer_id = $1 AND ld.business_id = $2`, [reviewerId, bizId],
      ),
    ]);

    const bizCountry = await this.dataSource.query(
      `SELECT co.code FROM businesses b JOIN countries co ON co.id = b.country_id WHERE b.id = $1`, [bizId],
    );

    return {
      accountAgeDays:       parseInt(userRow[0]?.age_days ?? '0'),
      totalReviewsEver:     parseInt(reviewCount[0]?.count ?? '0'),
      reviewsSameDay:       parseInt(sameDayReviews[0]?.count ?? '0'),
      sameIpAsBusiness:     parseInt(bizIpRows[0]?.count ?? '0') > 0,
      sameDeviceAsBusiness: false,
      timeToWriteSeconds:   0,
      reviewerCountryCode:  userRow[0]?.country_code,
      businessCountryCode:  bizCountry[0]?.code,
      hasPreviousLead:      parseInt(leadRows[0]?.count ?? '0') > 0,
    };
  }
}

// ── reviews.service.ts ────────────────────────────────────────

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private repo: Repository<Review>,
    private fraudService: FraudDetectionService,
    @InjectQueue('es-sync')       private esQueue: Queue,
    @InjectQueue('notifications') private notifQueue: Queue,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateReviewDto, reviewerId: string, meta: {ip: string; userAgent: string; timeToWriteMs: number}): Promise<Review> {
    // Check duplicate
    const existing = await this.repo.findOne({ where: { businessId: dto.businessId, reviewerId } });
    if (existing) throw new ConflictException('You have already reviewed this business');

    // Fraud analysis
    const fraud = await this.fraudService.analyzeReview(
      { rating: dto.rating, body: dto.body, reviewerId, businessId: dto.businessId },
      meta,
    );

    const review = this.repo.create({
      ...dto,
      reviewerId,
      fraudScore: fraud.score,
      fraudFlags: fraud.flags,
      isFlagged:  fraud.shouldFlag,
      isApproved: !fraud.shouldReject,  // Auto-reject if very high fraud score
      ipAddress:  meta.ip,
    });

    const saved = await this.repo.save(review);

    // Re-sync ES (rating changed)
    await this.esQueue.add('index', { id: dto.businessId });

    // Notify business owner
    if (!fraud.shouldReject) {
      await this.notifQueue.add('new-review', {
        reviewId:   saved.id,
        businessId: dto.businessId,
        rating:     dto.rating,
      });
    }

    return saved;
  }

  async getForBusiness(bizId: string, page = 1, limit = 10) {
    const [reviews, total] = await this.repo.findAndCount({
      where: { businessId: bizId, isApproved: true, isFlagged: false },
      order: { createdAt: 'DESC' },
      skip:  (page - 1) * limit,
      take:  limit,
      relations: ['reviewer'],
    });

    // Rating breakdown
    const breakdown = await this.dataSource.query(`
      SELECT rating, COUNT(*) as count
      FROM reviews
      WHERE business_id = $1 AND is_approved = TRUE AND is_flagged = FALSE
      GROUP BY rating ORDER BY rating DESC
    `, [bizId]);

    return {
      data:  reviews,
      total,
      page,
      limit,
      totalPages:   Math.ceil(total / limit),
      breakdown,
    };
  }

  async reply(reviewId: string, bizOwnerId: string, dto: ReplyReviewDto): Promise<Review> {
    const review = await this.repo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    // Verify the replier owns the business
    const biz = await this.dataSource.query(
      `SELECT id FROM businesses WHERE id = $1 AND owner_id = $2`,
      [review.businessId, bizOwnerId],
    );
    if (!biz.length) throw new ForbiddenException('Not authorized');

    review.ownerReply     = dto.reply;
    review.ownerRepliedAt = new Date();
    return this.repo.save(review);
  }

  async markHelpful(reviewId: string, userId: string): Promise<void> {
    // Prevent duplicate helpful marks
    const key = `helpful:${reviewId}:${userId}`;
    const marked = await this.dataSource.query(
      `SELECT id FROM review_helpful WHERE review_id = $1 AND user_id = $2`, [reviewId, userId],
    ).catch(() => []);

    if (!marked.length) {
      await this.dataSource.query(
        `UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1`, [reviewId],
      );
    }
  }

  async report(reviewId: string, userId: string, reason: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE reviews SET reported_count = reported_count + 1 WHERE id = $1`, [reviewId],
    );
    // Auto-flag if 3+ reports
    await this.dataSource.query(
      `UPDATE reviews SET is_flagged = TRUE WHERE id = $1 AND reported_count >= 3`, [reviewId],
    );
  }
}

// ── reviews.controller.ts ─────────────────────────────────────
import { Patch, Headers, Ip } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('businesses/:id/reviews')
  getForBusiness(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reviewsService.getForBusiness(id, +page, +limit);
  }

  @Post('reviews')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Throttle({ medium: { limit: 3, ttl: 60000 } })
  create(
    @Body() dto: CreateReviewDto,
    @Request() req: any,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Headers('x-time-to-write') timeToWrite: string,
  ) {
    return this.reviewsService.create(dto, req.user.id, {
      ip: ip ?? '0.0.0.0',
      userAgent: ua,
      timeToWriteMs: parseInt(timeToWrite ?? '60000'),
    });
  }

  @Post('owner/reviews/:id/reply')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  reply(@Param('id') id: string, @Body() dto: ReplyReviewDto, @Request() req: any) {
    return this.reviewsService.reply(id, req.user.id, dto);
  }

  @Post('reviews/:id/helpful')
  @UseGuards(AuthGuard('jwt'))
  markHelpful(@Param('id') id: string, @Request() req: any) {
    return this.reviewsService.markHelpful(id, req.user.id);
  }

  @Post('reviews/:id/report')
  @UseGuards(AuthGuard('jwt'))
  report(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    return this.reviewsService.report(id, req.user.id, reason);
  }
}

// ── reviews.module.ts ─────────────────────────────────────────
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    BullModule.registerQueue({ name: 'es-sync' }, { name: 'notifications' }),
  ],
  controllers: [ReviewsController],
  providers:   [ReviewsService, FraudDetectionService],
  exports:     [ReviewsService],
})
export class ReviewsModule {}
