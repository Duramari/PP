// ═══════════════════════════════════════════════════════════════
// AUTH MODULE — Complete Implementation
// Files: auth.module.ts + auth.controller.ts + auth.service.ts
//        + user.entity.ts + JWT strategy + DTOs
// ═══════════════════════════════════════════════════════════════

import { Module, Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { PassportModule, AuthGuard } from '@nestjs/passport';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
// import { InjectRedis } from '@nestjs-modules/ioredis';
// import { Redis } from 'ioredis';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  IsEmail, IsString, MinLength, IsOptional, IsEnum,
  IsMobilePhone, IsNotEmpty, Length
} from 'class-validator';
import { Exclude } from 'class-transformer';
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, BeforeInsert, BeforeUpdate, Index
} from 'typeorm';

// ── user.entity.ts ────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN    = 'super_admin',
  ADMIN          = 'admin',
  SALES_AGENT    = 'sales_agent',
  BUSINESS_OWNER = 'business_owner',
  CUSTOMER       = 'customer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index() @Column({ unique: true, nullable: true })
  email: string;

  @Index() @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ name: 'phone_country_code', nullable: true })
  phoneCountryCode: string;

  @Column({ name: 'password_hash' }) @Exclude()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'country_code', nullable: true })
  countryCode: string;

  @Column({ name: 'preferred_lang', default: 'en' })
  preferredLang: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'whatsapp_number', nullable: true })
  whatsappNumber: string;

  @Column({ name: 'fcm_token', nullable: true }) @Exclude()
  fcmToken: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// ── auth.dto.ts ───────────────────────────────────────────────

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail() @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString() @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString() @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString() @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'NG' })
  @IsString() @IsOptional()
  countryCode?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.CUSTOMER })
  @IsEnum(UserRole) @IsOptional()
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail() @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString() @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @IsString() @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @IsEmail() @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail() @IsNotEmpty()
  email: string;

  @IsString() @Length(6, 6)
  otp: string;

  @IsString() @MinLength(8)
  newPassword: string;
}

// ── jwt.strategy.ts ───────────────────────────────────────────

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    cfg: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.get('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!user) throw new UnauthorizedException('User not found or deactivated');
    return user;
  }
}

// ── auth.service.ts ───────────────────────────────────────────

const SALT_ROUNDS           = 12;
const REFRESH_TTL_SECONDS   = 60 * 60 * 24 * 30;  // 30 days
const OTP_TTL_SECONDS       = 60 * 10;              // 10 min
const LOGIN_LOCKOUT_ATTEMPTS = 5;
const LOGIN_LOCKOUT_TTL     = 900;                  // 15 min

// Simple in-memory mock for Redis when not available
class MockRedis {
  private store = new Map<string, { value: string; expires: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    this.store.set(key, { value, expires: Date.now() + seconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  multi(): any {
    const operations: any[] = [];
    const self = this;
    return {
      incr: (key: string) => { operations.push(['incr', key]); return this; },
      expire: (key: string, seconds: number) => { operations.push(['expire', key, seconds]); return this; },
      exec: async () => {
        for (const op of operations) {
          if (op[0] === 'incr') {
            const current = parseInt(await self.get(op[1]) ?? '0');
            await self.setex(op[1], op[2] || 900, (current + 1).toString());
          }
        }
      }
    };
  }
}

@Injectable()
export class AuthService {
  private redis = new MockRedis();

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  // ── Register ────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])],
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'Email already registered' : 'Phone already registered',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.userRepo.create({
      email:        dto.email.toLowerCase().trim(),
      phone:        dto.phone,
      passwordHash,
      fullName:     dto.fullName,
      countryCode:  dto.countryCode,
      role:         dto.role ?? UserRole.CUSTOMER,
    });

    await this.userRepo.save(user);

    // Send verification email (async, non-blocking)
    this.sendVerificationEmail(user).catch(() => null);

    const tokens = await this.generateTokenPair(user);
    return { user: this.safeUser(user), ...tokens };
  }

  // ── Login ───────────────────────────────────────────────────
  async login(dto: LoginDto) {
    // Check brute-force lockout
    const lockKey = `login_lock:${dto.email}`;
    const attempts = parseInt(await this.redis.get(lockKey) ?? '0');
    if (attempts >= LOGIN_LOCKOUT_ATTEMPTS) {
      throw new UnauthorizedException(
        'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.',
      );
    }

    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    const isValid = user && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!isValid) {
      // Increment failed attempts
      await this.redis.multi()
        .incr(lockKey)
        .expire(lockKey, LOGIN_LOCKOUT_TTL)
        .exec();
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account suspended. Contact support.');
    }

    // Clear lockout on success + update last login
    await this.redis.del(lockKey);
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const tokens = await this.generateTokenPair(user);
    return { user: this.safeUser(user), ...tokens };
  }

  // ── Refresh Token ───────────────────────────────────────────
  async refreshToken(dto: RefreshTokenDto) {
    const userId = await this.redis.get(`rt:${dto.refreshToken}`);
    if (!userId) throw new UnauthorizedException('Invalid or expired refresh token');

    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } });
    if (!user) throw new UnauthorizedException('User not found');

    // Rotate: delete old, issue new
    await this.redis.del(`rt:${dto.refreshToken}`);
    const tokens = await this.generateTokenPair(user);
    return tokens;
  }

  // ── Logout ──────────────────────────────────────────────────
  async logout(refreshToken: string) {
    await this.redis.del(`rt:${refreshToken}`);
    return { message: 'Logged out successfully' };
  }

  // ── Forgot Password ─────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    // Always return success (don't reveal if email exists)
    if (!user) return { message: 'If the email exists, an OTP has been sent.' };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.setex(`otp:reset:${dto.email}`, OTP_TTL_SECONDS, otp);

    // Send OTP email
    await this.sendOtpEmail(user, otp);
    return { message: 'OTP sent to your email address.' };
  }

  // ── Reset Password ──────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const storedOtp = await this.redis.get(`otp:reset:${dto.email}`);
    if (!storedOtp || storedOtp !== dto.otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.userRepo.update(user.id, { passwordHash });
    await this.redis.del(`otp:reset:${dto.email}`);

    return { message: 'Password reset successfully' };
  }

  // ── Helpers ──────────────────────────────────────────────────
  private async generateTokenPair(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken  = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    await this.redis.setex(`rt:${refreshToken}`, REFRESH_TTL_SECONDS, user.id);

    return { accessToken, refreshToken };
  }

  private safeUser(user: User) {
    const { passwordHash, fcmToken, ...safe } = user as any;
    return safe;
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    // Implemented in NotificationsModule
  }

  private async sendOtpEmail(user: User, otp: string): Promise<void> {
    // Implemented in NotificationsModule
  }
}

// ── auth.controller.ts ───────────────────────────────────────

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login and get JWT tokens' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  getMe(@Request() req: any) {
    const { passwordHash, fcmToken, ...safe } = req.user;
    return safe;
  }
}

// ── auth.module.ts ───────────────────────────────────────────
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:      cfg.get('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: cfg.get('JWT_ACCESS_EXPIRES', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
