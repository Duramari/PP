import { Module }             from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { BullModule }        from '@nestjs/bullmq';
import { ThrottlerModule }   from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule }    from '@nestjs/schedule';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
// import { RedisModule }       from '@nestjs-modules/ioredis';

import { AuthModule }          from './modules/auth/auth.module';
// import { BusinessesModule }    from './modules/businesses/businesses.module';
// import { SearchModule }        from './modules/search/search.module';
// import { LeadsModule }         from './modules/leads/leads.module';
// import { PaymentsModule }      from './modules/payments/payments.module';
// import { ReviewsModule }       from './modules/reviews/reviews.module';
import { AdminModule }         from './modules/admin/admin.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
import { AgentsModule }        from './modules/agents/agents.module';

@Module({
  imports: [
    // ── Config (global) ───────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.production'],
    }),

    // ── Database (TypeORM + PostgreSQL) ───────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: cfg.get('NODE_ENV') === 'development', // NEVER true in prod
        logging: cfg.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
        extra: {
          max: cfg.get<number>('DATABASE_POOL_MAX', 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),

    // ── Redis (disabled - requires Redis service) ───────────
    // RedisModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (cfg: ConfigService) => ({
    //     type: 'single',
    //     url: cfg.get<string>('REDIS_URL'),
    //     retryStrategy: (times: number) => Math.min(times * 100, 3000),
    //   }),
    // }),

    // ── BullMQ (disabled - requires Redis) ──────────────────
    // BullModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (cfg: ConfigService) => ({
    //     connection: { url: cfg.get<string>('REDIS_URL') },
    //     defaultJobOptions: {
    //       attempts: 3,
    //       backoff: { type: 'exponential', delay: 2000 },
    //       removeOnComplete: 100,
    //       removeOnFail: 50,
    //     },
    //   }),
    // }),

    // ── Elasticsearch (disabled - requires ES service) ───────
    // ElasticsearchModule.registerAsync({
    //   inject: [ConfigService],
    //   useFactory: (cfg: ConfigService) => ({
    //     node: cfg.get<string>('ELASTICSEARCH_URL', 'http://localhost:9200'),
    //     requestTimeout: 10000,
    //   }),
    // }),

    // ── Rate limiting ────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },
      { name: 'medium', ttl: 10000, limit: 50  },
      { name: 'long',   ttl: 60000, limit: 200 },
    ]),

    // ── Events ───────────────────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: true }),

    // ── Cron jobs ────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature modules ──────────────────────────────────────
    AuthModule,
    // BusinessesModule,
    // SearchModule,
    // LeadsModule,
    // PaymentsModule,
    // ReviewsModule,
    AdminModule,
    // NotificationsModule,
    AgentsModule,
  ],
})
export class AppModule {}
