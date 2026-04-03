// ═══════════════════════════════════════════════════════════════
// SEARCH MODULE — Elasticsearch with function_score ranking
// The MOST CRITICAL module — this IS the product
// ═══════════════════════════════════════════════════════════════

// ── search.dto.ts ─────────────────────────────────────────────
import { IsOptional, IsString, IsNumber, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiPropertyOptional({ example: 'plumber' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  countryCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  categorySlug?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber()
  lat?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional() @Type(() => Number) @IsNumber()
  radiusKm?: number = 10;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber()
  minRating?: number;

  @ApiPropertyOptional({ enum: ['relevance','rating','distance','reviews','newest'] })
  @IsOptional() @IsString()
  sortBy?: string = 'relevance';

  @ApiPropertyOptional({ default: false })
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  openNow?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsNumber()
  limit?: number = 20;

  @IsOptional() @IsString()
  sessionId?: string;

  @IsOptional() @IsString()
  userId?: string;
}

// ── elasticsearch/business.index.ts ──────────────────────────
export const BUSINESS_INDEX = 'businesses_v1';

export const BUSINESS_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        dialbee_text: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'stop', 'asciifolding', 'dialbee_synonym'],
        },
        dialbee_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'stop', 'asciifolding'],
        },
      },
      filter: {
        dialbee_synonym: {
          type: 'synonym',
          synonyms: [
            'plumber, plumbing, pipe repair',
            'electrician, electrical, wiring',
            'doctor, physician, medical, clinic',
            'lawyer, attorney, solicitor',
            'restaurant, food, eatery, dining',
            'hotel, accommodation, lodge',
            'salon, barber, hairdresser, beauty',
          ],
        },
      },
    },
  },
  mappings: {
    properties: {
      id:                   { type: 'keyword' },
      name:                 { type: 'text', analyzer: 'dialbee_text', search_analyzer: 'dialbee_search', boost: 4 },
      slug:                 { type: 'keyword' },
      tagline:              { type: 'text', analyzer: 'dialbee_text', boost: 2 },
      description:          { type: 'text', analyzer: 'dialbee_text' },
      category_id:          { type: 'keyword' },
      category_name:        { type: 'text', analyzer: 'dialbee_text', boost: 3 },
      category_slug:        { type: 'keyword' },
      city:                 { type: 'keyword' },
      city_slug:            { type: 'keyword' },
      country_code:         { type: 'keyword' },
      neighborhood:         { type: 'text', analyzer: 'dialbee_text', boost: 1.5 },
      location:             { type: 'geo_point' },
      phone_primary:        { type: 'keyword' },
      whatsapp:             { type: 'keyword' },
      logo_url:             { type: 'keyword', index: false },
      avg_rating:           { type: 'float' },
      total_reviews:        { type: 'integer' },
      response_rate:        { type: 'float' },
      avg_response_time_hrs:{ type: 'float' },
      total_leads:          { type: 'integer' },
      profile_completeness: { type: 'float' },
      subscription_tier:    { type: 'keyword' },
      is_active:            { type: 'boolean' },
      is_featured:          { type: 'boolean' },
      is_open_now:          { type: 'boolean' },
      verification_status:  { type: 'keyword' },
      ai_quality_score:     { type: 'float' },
      tags:                 { type: 'text', analyzer: 'dialbee_text' },
      services:             { type: 'text', analyzer: 'dialbee_text' },
      year_established:     { type: 'integer' },
      indexed_at:           { type: 'date' },
    },
  },
};

// ── search.service.ts ─────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

const SEARCH_CACHE_TTL = 180; // 3 minutes
const AUTOCOMPLETE_TTL = 60;  // 1 minute

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly es: ElasticsearchService,
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  // ════════════════════════════════════════════════════════
  // MAIN SEARCH — THE MONEY FUNCTION
  // ════════════════════════════════════════════════════════
  async search(dto: SearchQueryDto) {
    const cacheKey = this.buildCacheKey(dto);

    // Try Redis cache (skip for personalized/authenticated searches)
    if (!dto.userId && !dto.openNow) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }
    }

    let result: any;
    try {
      result = await this.esSearch(dto);
    } catch (err) {
      this.logger.error('ES search failed, falling back to DB', err.message);
      result = await this.dbFallbackSearch(dto);
    }

    // Cache result
    if (!dto.userId) {
      await this.redis.setex(cacheKey, SEARCH_CACHE_TTL, JSON.stringify(result));
    }

    // Track search event asynchronously
    this.trackSearch(dto, result.total).catch(() => null);

    return result;
  }

  // ── Elasticsearch query ────────────────────────────────
  private async esSearch(dto: SearchQueryDto) {
    const { q, page = 1, limit = 20 } = dto;
    const from = (page - 1) * limit;

    // ── Build bool filters ─────────────────────────────
    const filters: any[] = [
      { term: { is_active: true } },
    ];

    if (dto.categoryId)   filters.push({ term: { category_id: dto.categoryId } });
    if (dto.categorySlug) filters.push({ term: { category_slug: dto.categorySlug } });
    if (dto.city)         filters.push({ term: { city: dto.city.toLowerCase() } });
    if (dto.countryCode)  filters.push({ term: { country_code: dto.countryCode.toUpperCase() } });
    if (dto.minRating)    filters.push({ range: { avg_rating: { gte: dto.minRating } } });
    if (dto.openNow)      filters.push({ term: { is_open_now: true } });

    if (dto.lat && dto.lng) {
      filters.push({
        geo_distance: {
          distance: `${dto.radiusKm ?? 10}km`,
          location: { lat: dto.lat, lon: dto.lng },
        },
      });
    }

    // ── Text query ─────────────────────────────────────
    const textQuery = q
      ? {
          multi_match: {
            query: q,
            fields: ['name^4', 'category_name^3', 'tagline^2', 'description^1', 'tags^2', 'services^1.5', 'neighborhood^1.5'],
            type: 'best_fields',
            fuzziness: 'AUTO',
            prefix_length: 2,
            tie_breaker: 0.3,
          },
        }
      : { match_all: {} };

    // ══════════════════════════════════════════════════
    // FUNCTION SCORE — Revenue model in code
    // Paid listings score higher. This is what
    // makes businesses pay for subscriptions.
    // ══════════════════════════════════════════════════
    const functionScore = {
      query: {
        bool: {
          must: [textQuery],
          filter: filters,
        },
      },
      functions: [
        // ── 1. Subscription tier boost (REVENUE DRIVER) ──
        { filter: { term: { subscription_tier: 'enterprise' } }, weight: 4.0 },
        { filter: { term: { subscription_tier: 'premium' } },    weight: 3.0 },
        { filter: { term: { subscription_tier: 'standard' } },   weight: 1.8 },
        // free tier = 1.0 (no boost)

        // ── 2. Featured boost ───────────────────────────
        { filter: { term: { is_featured: true } }, weight: 2.5 },

        // ── 3. Rating boost ─────────────────────────────
        {
          field_value_factor: {
            field:    'avg_rating',
            factor:   0.3,
            modifier: 'sqrt',
            missing:  3.0,
          },
        },

        // ── 4. Review count (social proof) ──────────────
        {
          field_value_factor: {
            field:    'total_reviews',
            factor:   0.08,
            modifier: 'log1p',
            missing:  0,
          },
        },

        // ── 5. Response rate boost ───────────────────────
        {
          field_value_factor: {
            field:    'response_rate',
            factor:   0.2,
            modifier: 'none',
            missing:  0,
          },
        },

        // ── 6. AI quality score ─────────────────────────
        {
          field_value_factor: {
            field:    'ai_quality_score',
            factor:   1.0,
            modifier: 'none',
            missing:  0.5,
          },
        },

        // ── 7. Profile completeness ─────────────────────
        {
          field_value_factor: {
            field:    'profile_completeness',
            factor:   0.4,
            modifier: 'none',
            missing:  0.3,
          },
        },

        // ── 8. Verified business boost ───────────────────
        { filter: { term: { verification_status: 'verified' } }, weight: 1.3 },

        // ── 9. Open now boost ────────────────────────────
        { filter: { term: { is_open_now: true } }, weight: 1.2 },

        // ── 10. Distance decay (closer = better) ─────────
        ...(dto.lat && dto.lng
          ? [{
              gauss: {
                location: {
                  origin: { lat: dto.lat, lon: dto.lng },
                  scale:  `${Math.max(3, (dto.radiusKm ?? 10) / 2)}km`,
                  offset: '1km',
                  decay:  0.5,
                },
              },
            }]
          : []),
      ],
      score_mode: 'sum' as const,
      boost_mode: 'multiply' as const,
      min_score:  dto.sortBy === 'relevance' ? 0.5 : undefined,
    };

    // ── Sort ──────────────────────────────────────────
    let sort: any[] = ['_score'];
    if (dto.sortBy === 'rating')   sort = [{ avg_rating: 'desc' }, '_score'];
    if (dto.sortBy === 'reviews')  sort = [{ total_reviews: 'desc' }, '_score'];
    if (dto.sortBy === 'newest')   sort = [{ indexed_at: 'desc' }];
    if (dto.sortBy === 'distance' && dto.lat && dto.lng) {
      sort = [{
        _geo_distance: {
          location: { lat: dto.lat, lon: dto.lng },
          order: 'asc',
          unit: 'km',
        },
      }];
    }

    const response = await this.es.search({
      index: BUSINESS_INDEX,
      from,
      size: limit,
      query:     { function_score: functionScore as any },
      sort,
      highlight: {
        fields: {
          name:        { pre_tags: ['<mark>'], post_tags: ['</mark>'] },
          description: { pre_tags: ['<mark>'], post_tags: ['</mark>'], fragment_size: 150, number_of_fragments: 1 },
        },
      },
      aggs: {
        by_category: { terms: { field: 'category_id', size: 10 } },
        rating_ranges: {
          range: {
            field: 'avg_rating',
            ranges: [{ key: '4+', from: 4 }, { key: '3+', from: 3, to: 4 }],
          },
        },
      },
      _source: ['id','name','slug','tagline','city','country_code','category_name',
                'category_slug','avg_rating','total_reviews','response_rate',
                'subscription_tier','verification_status','is_open_now','is_featured',
                'location','logo_url','phone_primary','whatsapp','profile_completeness'],
    });

    const hits  = response.hits.hits;
    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total as any)?.value ?? 0;

    const businesses = hits.map((hit: any) => ({
      ...hit._source,
      _score:    hit._score,
      highlight: hit.highlight ?? {},
      distance:  hit.sort?.[0] && dto.sortBy === 'distance' ? parseFloat(hit.sort[0].toFixed(1)) : undefined,
    }));

    // ── Inject sponsored slots at positions 1, 4, 8 ──
    const withSponsored = await this.injectSponsoredSlots(businesses, dto);

    return {
      data:       withSponsored,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      facets: {
        categories:   (response.aggregations as any)?.by_category?.buckets ?? [],
        ratingRanges: (response.aggregations as any)?.rating_ranges?.buckets ?? [],
      },
      query:    dto.q,
      city:     dto.city,
      category: dto.categorySlug,
    };
  }

  // ── Autocomplete ──────────────────────────────────────
  async autocomplete(prefix: string, city?: string, countryCode?: string): Promise<any[]> {
    if (!prefix || prefix.length < 2) return [];

    const cacheKey = `ac:${prefix.toLowerCase()}:${city ?? ''}:${countryCode ?? ''}`;
    const cached   = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const filters: any[] = [{ term: { is_active: true } }];
    if (city)        filters.push({ term: { city: city.toLowerCase() } });
    if (countryCode) filters.push({ term: { country_code: countryCode.toUpperCase() } });

    const response = await this.es.search({
      index: BUSINESS_INDEX,
      size:  8,
      query: {
        bool: {
          must: {
            multi_match: {
              query:  prefix,
              fields: ['name^3', 'category_name^2', 'tagline'],
              type:   'phrase_prefix',
            },
          },
          filter: filters,
        },
      },
      _source: ['name', 'category_name', 'slug', 'city'],
    });

    const results = response.hits.hits.map((h: any) => ({
      type:     'business',
      label:    h._source.name,
      category: h._source.category_name,
      slug:     h._source.slug,
      city:     h._source.city,
    }));

    // Add category suggestions
    const categorySuggestions = await this.getCategorySuggestions(prefix);
    const combined = [...categorySuggestions, ...results].slice(0, 8);

    await this.redis.setex(cacheKey, AUTOCOMPLETE_TTL, JSON.stringify(combined));
    return combined;
  }

  // ── Index a business into ES ──────────────────────────
  async indexBusiness(bizId: string): Promise<void> {
    const rows = await this.dataSource.query(`
      SELECT
        b.id, b.name, b.slug, b.tagline, b.description,
        b.phone_primary, b.whatsapp, b.logo_url,
        b.city_id, b.country_id,
        b.location_lat, b.location_lng, b.neighborhood,
        b.avg_rating, b.total_reviews, b.response_rate,
        b.avg_response_time_hrs, b.total_leads,
        b.profile_completeness, b.subscription_tier,
        b.is_active, b.is_featured, b.verification_status,
        b.year_established, b.updated_at,
        ct.name as city_name, ct.slug as city_slug,
        co.code as country_code,
        cat.id as category_id, cat.name as category_name, cat.slug as category_slug,
        COALESCE(
          (SELECT STRING_AGG(bs.name, ' ')
           FROM business_services bs WHERE bs.business_id = b.id AND bs.is_active = TRUE),
          ''
        ) as services
      FROM businesses b
      JOIN cities ct      ON ct.id = b.city_id
      JOIN countries co   ON co.id = b.country_id
      JOIN categories cat ON cat.id = b.category_id
      WHERE b.id = $1
    `, [bizId]);

    if (!rows.length) return;
    const biz = rows[0];

    // Calculate is_open_now
    const isOpenNow = await this.calcIsOpenNow(bizId);

    const doc = {
      id:                   biz.id,
      name:                 biz.name,
      slug:                 biz.slug,
      tagline:              biz.tagline ?? '',
      description:          biz.description ?? '',
      category_id:          biz.category_id,
      category_name:        biz.category_name,
      category_slug:        biz.category_slug,
      city:                 biz.city_name?.toLowerCase(),
      city_slug:            biz.city_slug,
      country_code:         biz.country_code,
      neighborhood:         biz.neighborhood ?? '',
      location:             biz.location_lat && biz.location_lng
                              ? { lat: parseFloat(biz.location_lat), lon: parseFloat(biz.location_lng) }
                              : null,
      phone_primary:        biz.phone_primary,
      whatsapp:             biz.whatsapp,
      logo_url:             biz.logo_url,
      avg_rating:           parseFloat(biz.avg_rating) || 0,
      total_reviews:        parseInt(biz.total_reviews) || 0,
      response_rate:        parseFloat(biz.response_rate) || 0,
      avg_response_time_hrs:parseFloat(biz.avg_response_time_hrs) || null,
      total_leads:          parseInt(biz.total_leads) || 0,
      profile_completeness: parseFloat(biz.profile_completeness) || 0,
      subscription_tier:    biz.subscription_tier,
      is_active:            biz.is_active,
      is_featured:          biz.is_featured,
      is_open_now:          isOpenNow,
      verification_status:  biz.verification_status,
      ai_quality_score:     0.5,  // Updated by ML pipeline
      services:             biz.services ?? '',
      year_established:     biz.year_established,
      indexed_at:           new Date().toISOString(),
    };

    await this.es.index({ index: BUSINESS_INDEX, id: bizId, document: doc });
    this.logger.log(`Indexed business ${bizId} (${biz.name})`);
  }

  async removeFromIndex(bizId: string): Promise<void> {
    try {
      await this.es.delete({ index: BUSINESS_INDEX, id: bizId });
    } catch (err) {
      this.logger.warn(`Could not remove ${bizId} from index: ${err.message}`);
    }
  }

  // ── Bulk reindex (for migration/sync) ────────────────
  async bulkReindex(citySlug?: string): Promise<{ indexed: number; errors: number }> {
    let offset = 0;
    const batchSize = 100;
    let indexed = 0;
    let errors  = 0;

    while (true) {
      const query = citySlug
        ? `SELECT b.id FROM businesses b JOIN cities ct ON ct.id = b.city_id WHERE ct.slug = $3 AND b.status = 'active' LIMIT $1 OFFSET $2`
        : `SELECT b.id FROM businesses b WHERE b.status = 'active' LIMIT $1 OFFSET $2`;

      const params = citySlug ? [batchSize, offset, citySlug] : [batchSize, offset];
      const rows   = await this.dataSource.query(query, params);
      if (!rows.length) break;

      await Promise.allSettled(
        rows.map((r: any) =>
          this.indexBusiness(r.id)
            .then(() => indexed++)
            .catch(() => errors++),
        ),
      );

      offset += batchSize;
      this.logger.log(`Bulk reindex progress: ${indexed} indexed, ${errors} errors`);
    }

    return { indexed, errors };
  }

  // ── Trending searches ─────────────────────────────────
  async getTrending(cityId: string, limit = 10): Promise<string[]> {
    const rows = await this.dataSource.query(`
      SELECT query, COUNT(*) as count
      FROM search_events
      WHERE city_id = $1
        AND query IS NOT NULL AND LENGTH(query) > 2
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY query
      ORDER BY count DESC
      LIMIT $2
    `, [cityId, limit]);
    return rows.map((r: any) => r.query);
  }

  // ── Helpers ───────────────────────────────────────────
  private async injectSponsoredSlots(businesses: any[], dto: SearchQueryDto): Promise<any[]> {
    if (!dto.categorySlug && !dto.city) return businesses;

    // Fetch sponsored listings for this context
    const sponsored = await this.dataSource.query(`
      SELECT b.id, b.name, b.slug, b.logo_url, b.avg_rating, b.total_reviews,
             b.phone_primary, b.subscription_tier, b.verification_status
      FROM featured_listings fl
      JOIN businesses b ON b.id = fl.business_id
      WHERE fl.is_active = TRUE
        AND fl.ends_at > NOW()
        AND fl.starts_at <= NOW()
        ${dto.city ? `AND b.city_id = (SELECT id FROM cities WHERE slug = '${dto.city.toLowerCase()}' LIMIT 1)` : ''}
      ORDER BY fl.position
      LIMIT 3
    `);

    if (!sponsored.length) return businesses;

    const result = [...businesses];
    const positions = [0, 3, 7]; // Inject at positions 1, 4, 8

    sponsored.forEach((s: any, i: number) => {
      const pos = positions[i];
      if (pos <= result.length) {
        result.splice(pos, 0, { ...s, _sponsored: true });
      }
    });

    return result;
  }

  private async getCategorySuggestions(prefix: string): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT name, slug FROM categories
      WHERE name ILIKE $1 AND is_active = TRUE
      ORDER BY sort_order LIMIT 3
    `, [`${prefix}%`]);

    return rows.map((r: any) => ({
      type:  'category',
      label: r.name,
      slug:  r.slug,
    }));
  }

  private async calcIsOpenNow(bizId: string): Promise<boolean> {
    const now     = new Date();
    const dow     = now.getDay();
    const timeNow = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const rows = await this.dataSource.query(`
      SELECT open_time, close_time, is_closed, is_24h
      FROM business_hours
      WHERE business_id = $1 AND day_of_week = $2
      LIMIT 1
    `, [bizId, dow]);

    if (!rows.length || rows[0].is_closed) return false;
    if (rows[0].is_24h) return true;

    const open  = rows[0].open_time?.slice(0, 5);
    const close = rows[0].close_time?.slice(0, 5);
    if (!open || !close) return false;

    return timeNow >= open && timeNow <= close;
  }

  private async dbFallbackSearch(dto: SearchQueryDto) {
    this.logger.warn('⚠️ Using DB fallback search (ES is down)');
    const rows = await this.dataSource.query(`
      SELECT b.id, b.name, b.slug, b.avg_rating, b.total_reviews,
             b.subscription_tier, b.logo_url, b.phone_primary,
             cat.name as category_name, ct.name as city_name
      FROM businesses b
      JOIN categories cat ON cat.id = b.category_id
      JOIN cities ct      ON ct.id = b.city_id
      WHERE b.status = 'active' AND b.is_active = TRUE
        ${dto.q ? `AND (b.name ILIKE '%${dto.q}%' OR cat.name ILIKE '%${dto.q}%')` : ''}
        ${dto.city ? `AND LOWER(ct.name) = LOWER('${dto.city}')` : ''}
      ORDER BY
        CASE b.subscription_tier WHEN 'enterprise' THEN 4 WHEN 'premium' THEN 3 WHEN 'standard' THEN 2 ELSE 1 END DESC,
        b.avg_rating DESC
      LIMIT $1 OFFSET $2
    `, [dto.limit ?? 20, ((dto.page ?? 1) - 1) * (dto.limit ?? 20)]);

    return { data: rows, total: rows.length, page: dto.page ?? 1, limit: dto.limit ?? 20, totalPages: 1, facets: {}, _fallback: true };
  }

  private async trackSearch(dto: SearchQueryDto, total: number): Promise<void> {
    await this.dataSource.query(`
      INSERT INTO search_events
        (id, session_id, user_id, query, city_id, country_id, results_count, created_at)
      VALUES
        (gen_random_uuid(), $1, $2, $3,
         (SELECT id FROM cities WHERE LOWER(name) = LOWER($4) LIMIT 1),
         (SELECT id FROM countries WHERE code = $5 LIMIT 1),
         $6, NOW())
    `, [
      dto.sessionId ?? 'anon',
      dto.userId ?? null,
      dto.q ?? null,
      dto.city ?? null,
      dto.countryCode ?? null,
      total,
    ]);
  }

  private buildCacheKey(dto: SearchQueryDto): string {
    return `search:v2:${JSON.stringify({
      q:    dto.q,
      city: dto.city,
      cat:  dto.categorySlug,
      lat:  dto.lat?.toFixed(2),
      lng:  dto.lng?.toFixed(2),
      r:    dto.radiusKm,
      sort: dto.sortBy,
      pg:   dto.page,
      open: dto.openNow,
    })}`;
  }
}

// ── elasticsearch/sync.processor.ts ──────────────────────────
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('es-sync')
export class EsSyncProcessor extends WorkerHost {
  constructor(private searchService: SearchService) { super(); }

  async process(job: Job): Promise<void> {
    const { name, data } = job;

    if (name === 'index') {
      await this.searchService.indexBusiness(data.id);
    } else if (name === 'remove') {
      await this.searchService.removeFromIndex(data.id);
    } else if (name === 'bulk-reindex') {
      await this.searchService.bulkReindex(data.citySlug);
    }
  }
}

// ── search.controller.ts ──────────────────────────────────────
import {
  Controller, Get, Query, Post, Body, UseGuards,
  Request, Param
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Main business search (Elasticsearch powered)' })
  search(@Query() dto: SearchQueryDto) {
    return this.searchService.search(dto);
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Typeahead suggestions' })
  autocomplete(
    @Query('q') q: string,
    @Query('city') city?: string,
    @Query('country') countryCode?: string,
  ) {
    return this.searchService.autocomplete(q, city, countryCode);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Trending searches in a city' })
  trending(@Query('cityId') cityId: string) {
    return this.searchService.getTrending(cityId);
  }

  // Admin: reindex all businesses
  @Post('admin/reindex')
  @UseGuards(AuthGuard('jwt'))
  reindex(@Query('city') citySlug?: string) {
    return this.searchService.bulkReindex(citySlug);
  }
}

// ── search.module.ts ──────────────────────────────────────────
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'es-sync' }),
  ],
  controllers: [SearchController],
  providers:   [SearchService, EsSyncProcessor],
  exports:     [SearchService],
})
export class SearchModule {}
