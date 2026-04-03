import { NestFactory }              from '@nestjs/core';
import { ValidationPipe }           from '@nestjs/common';
import { ConfigService }            from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet                       from 'helmet';
import * as compression             from 'compression';
import { AppModule }                from './app.module';
// import { HttpExceptionFilter }      from './common/filters/http-exception.filter';
// import { ResponseInterceptor }      from './common/interceptors/response.interceptor';
// import { LoggingInterceptor }       from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const config = app.get(ConfigService);
  const port    = config.get<number>('PORT', 3001);
  const isdev   = config.get('NODE_ENV') === 'development';

  // ── Security ──────────────────────────────────────────────
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }));
  app.use(compression());

  // ── CORS ──────────────────────────────────────────────────
  app.enableCors({
    origin: [
      config.get('FRONTEND_URL', 'http://localhost:3002'),
      'http://localhost:3002',
      'http://localhost:3000',
      'https://dialbee.com',
      /\.dialbee\.com$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ── Global prefix ─────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Global pipes ──────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // strip unknown fields
      forbidNonWhitelisted: false,
      transform: true,              // auto-transform types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters ────────────────────────────────────────
  // app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global interceptors ───────────────────────────────────
  // app.useGlobalInterceptors(
  //   new ResponseInterceptor(),
  //   new LoggingInterceptor(),
  // );

  // ── Swagger (dev only) ────────────────────────────────────
  if (isdev) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Dialbee API — Local Business Directory')
      .setDescription('Local Business Directory — Africa & Europe')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication')
      .addTag('businesses', 'Business listings')
      .addTag('search', 'Search & discovery')
      .addTag('leads', 'Lead generation')
      .addTag('payments', 'Subscriptions & payments')
      .addTag('admin', 'Admin panel')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  }

  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 Dialbee API running on http://localhost:${port}`);
  console.log(`   Environment: ${config.get('NODE_ENV')}`);
  console.log(`   Database:    ${config.get('DATABASE_URL')?.split('@')[1]}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
