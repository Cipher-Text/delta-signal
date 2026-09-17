import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { generateRefreshToken, hashRefreshToken } from './refresh-token.util';
import { PermissionsService } from '../permissions/permissions.service';
import { GamificationService } from '../gamification/gamification.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailService } from '../notifications/email.service';
import { StorageService } from '../media/storage.service';
import { PROFILE_PICTURE_MAX_SIZE_BYTES, PROFILE_PICTURE_MIME_TYPES } from '../media/media.constants';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_DAYS = 7;
const PASSWORD_RESET_TTL_MINUTES = 60;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const OAUTH_EXCHANGE_CODE_TTL_SECONDS = 30;

export interface DeviceMeta {
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly permissionsService: PermissionsService,
    private readonly gamification: GamificationService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async register(dto: RegisterDto, deviceMeta: DeviceMeta = {}) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: dto.displayName,
        passwordHash,
      },
      select: { id: true, email: true, displayName: true, role: true, createdAt: true },
    });

    await this.recordAuthEvent('USER_REGISTER', user.id, deviceMeta);

    // Fire-and-forget — registration must never fail because SMTP is unavailable.
    this.sendVerificationEmail(user.id).catch((err: unknown) => {
      this.logger.warn(`Failed to queue verification email for new user ${user.id}: ${String(err)}`);
    });

    const tokens = await this.issueTokens(
      { sub: user.id, email: user.email, role: user.role },
      deviceMeta,
    );
    return { user, ...tokens };
  }

  async login(dto: LoginDto, deviceMeta: DeviceMeta = {}) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      // No userId to attribute — record the attempted address instead, so a
      // spray across many unknown accounts is still visible.
      await this.recordFailedLogin(user?.id, email, deviceMeta);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Google-only accounts have no password hash — direct login not permitted.
    if (!user.passwordHash) {
      await this.recordFailedLogin(user.id, email, deviceMeta);
      throw new UnauthorizedException('This account uses Google sign-in. Please use "Sign in with Google".');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.recordFailedLogin(user.id, email, deviceMeta);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.recordAuthEvent('USER_LOGIN', user.id, deviceMeta);

    const tokens = await this.issueTokens(
      { sub: user.id, email: user.email, role: user.role },
      deviceMeta,
    );
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      ...tokens,
    };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        authProvider: true,
        createdAt: true,
        lastLoginAt: true,
        organizationMemberships: {
          select: {
            role: true,
            organization: { select: { id: true, name: true, type: true, isVerified: true } },
          },
          orderBy: { organization: { name: 'asc' } },
        },
        profile: {
          select: {
            phone: true,
            preferredLanguage: true,
            occupation: true,
            bio: true,
            expertise: true,
            researchInterests: true,
            education: true,
            institution: true,
            locationDistrict: true,
            locationCountry: true,
            profileVisibility: true,
            contactVisibility: true,
            linksVisibility: true,
            avatarUrl: true,
          },
        },
        socialLinks: { select: { platform: true, url: true }, orderBy: { platform: 'asc' } },
      },
    }).then(async (user) => {
      if (!user) return null;
      const permissions = await this.permissionsService.getPermissionsForRole(user.role);
      // Dynamic addition: if the user has any org memberships and doesn't already
      // hold organizations.access from their role grants, add it so the frontend
      // shows their org data.
      if (user.organizationMemberships.length > 0 && !permissions.includes('organizations.access')) {
        permissions.push('organizations.access');
      }
      return { ...user, organizations: user.organizationMemberships.map((membership) => ({ ...membership.organization, membershipRole: membership.role })), permissions };
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { socialLinks, displayName, ...profileData } = dto;
    await this.prisma.$transaction(async (tx) => {
      if (displayName !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { displayName } });
      }
      await tx.userProfile.upsert({
        where: { userId },
        create: { userId, ...profileData },
        update: profileData,
      });
      if (socialLinks) {
        await tx.userSocialLink.deleteMany({ where: { userId } });
        const links = Object.entries(socialLinks).filter(([, url]) => url.trim());
        if (links.length) {
          await tx.userSocialLink.createMany({
            data: links.map(([platform, url]) => ({ userId, platform, url: url.trim() })),
          });
        }
      }
    });
    // Re-evaluate badges and completeness without blocking the response.
    this.gamification
      .evaluateBadges(userId)
      .catch((err: unknown) => this.logger.warn(`Badge evaluation failed: ${String(err)}`));

    return this.getProfile(userId);
  }

  async updateProfilePicture(userId: string, file: Express.Multer.File) {
    if (!PROFILE_PICTURE_MIME_TYPES.includes(file.mimetype as (typeof PROFILE_PICTURE_MIME_TYPES)[number])) {
      throw new BadRequestException('Profile pictures must be JPG, PNG, or WebP images.');
    }
    if (file.size > PROFILE_PICTURE_MAX_SIZE_BYTES) {
      throw new BadRequestException('Profile pictures must be 5 MB or smaller.');
    }

    const oldProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { avatarKey: true },
    });
    const extension = extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
    const avatarKey = `profile/${userId}/avatar-${randomUUID()}${extension}`;
    const avatarUrl = await this.storage.upload(avatarKey, file.buffer, file.mimetype);

    try {
      await this.prisma.userProfile.upsert({
        where: { userId },
        create: { userId, avatarUrl, avatarKey },
        update: { avatarUrl, avatarKey },
      });
    } catch (error) {
      await this.storage.delete(avatarKey).catch(() => undefined);
      throw error;
    }

    if (oldProfile?.avatarKey && oldProfile.avatarKey !== avatarKey) {
      await this.storage.delete(oldProfile.avatarKey).catch((error: unknown) => {
        this.logger.warn(`Failed to remove previous profile picture: ${String(error)}`);
      });
    }

    return this.getProfile(userId);
  }

  async removeProfilePicture(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { avatarKey: true },
    });
    if (!profile) return;

    await this.prisma.userProfile.update({
      where: { userId },
      data: { avatarUrl: null, avatarKey: null },
    });
    if (profile.avatarKey) await this.storage.delete(profile.avatarKey).catch(() => undefined);
  }

  /** Changes password for an authenticated user after verifying their current password. */
  async changePassword(userId: string, dto: ChangePasswordDto, deviceMeta: DeviceMeta = {}) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.authProvider !== 'EMAIL' || !user.passwordHash) {
      throw new BadRequestException(
        'Password management is not available for accounts signed in with Google.',
      );
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Revoke all other active refresh tokens so sessions on other devices are invalidated.
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.recordAuthEvent('PASSWORD_CHANGE', userId, deviceMeta);
    return { success: true };
  }

  /**
   * Initiates a password reset. Always returns the same response to prevent
   * email enumeration — callers cannot tell whether the address exists.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Google-only accounts have no password — silently skip so the response
    // remains identical to the "email not found" case (enumeration-proof).
    if (user && user.isActive && user.authProvider === 'EMAIL') {
      const token = generateRefreshToken();
      const tokenHash = hashRefreshToken(token);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

      // Invalidate any outstanding reset tokens before issuing a new one.
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      await this.recordAuthEvent('PASSWORD_RESET_REQUEST', user.id, {});

      const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      await this.email.queuePasswordReset(user.email, user.displayName, resetUrl);
    }

    return { message: 'If that email is registered you will receive a reset link shortly.' };
  }

  /** Resets the password using a valid reset token. Invalidates all existing sessions. */
  async resetPassword(dto: ResetPasswordDto, deviceMeta: DeviceMeta = {}) {
    const tokenHash = hashRefreshToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Revoke all active refresh tokens — forces re-login on every device.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.recordAuthEvent('PASSWORD_RESET', record.userId, deviceMeta);
    return { success: true };
  }

  /** Sends (or re-sends) an email verification link to the authenticated user. */
  async sendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, isEmailVerified: true },
    });

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const token = generateRefreshToken();
    const tokenHash = hashRefreshToken(token);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

    // Invalidate any outstanding verification tokens before issuing a new one.
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    await this.recordAuthEvent('EMAIL_VERIFICATION_SENT', userId, {});

    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const verificationUrl = `${appUrl}/verify-email?token=${token}`;
    await this.email.queueVerification(user.email, user.displayName, verificationUrl);

    return { message: 'Verification email sent.' };
  }

  /** Marks the user's email as verified using a valid verification token. */
  async verifyEmail(dto: VerifyEmailDto, deviceMeta: DeviceMeta = {}) {
    const tokenHash = hashRefreshToken(dto.token);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Verification token is invalid or has expired');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } }),
      this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    await this.recordAuthEvent('EMAIL_VERIFIED', record.userId, deviceMeta);
    return { success: true };
  }

  /** Validates a refresh token, revokes it, and issues a brand new access+refresh pair. */
  async refresh(refreshToken: string, deviceMeta: DeviceMeta = {}) {
    const tokenRecord = await this.findValidRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({ where: { id: tokenRecord.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(
      { sub: user.id, email: user.email, role: user.role },
      deviceMeta,
    );
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      ...tokens,
    };
  }

  /** Revokes a refresh token. Idempotent — silently succeeds if already gone or revoked. */
  async logout(refreshToken: string, deviceMeta: DeviceMeta = {}) {
    const tokenHash = hashRefreshToken(refreshToken);
    // Read the owning user before revoking, so the audit event is attributable.
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Audit a real revocation only. Repeat logouts and unknown tokens still
    // succeed (the endpoint stays idempotent) but must not log duplicate or
    // unattributable events.
    if (record && count > 0) {
      await this.recordAuthEvent('USER_LOGOUT', record.userId, deviceMeta);
    }
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  /**
   * Finds or creates a user from a validated Google profile.
   *
   * - Existing Google user (matched by googleId): return as-is.
   * - Existing email/password user (matched by email): link their Google ID
   *   automatically (Google has already verified ownership of the address).
   * - No match: create a new GOOGLE-provider account with `isEmailVerified: true`.
   */
  async handleGoogleUser(profile: {
    email: string;
    googleId: string;
    displayName: string;
  }) {
    const email = profile.email.toLowerCase().trim();

    // 1. Look up by googleId — the fastest path for returning users.
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (user) {
      if (!user.isActive) throw new UnauthorizedException('Account is deactivated');
      return user;
    }

    // 2. Look up by email — may be an existing email/password account.
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (!byEmail.isActive) throw new UnauthorizedException('Account is deactivated');
      // Link the Google ID to the existing account. Subsequent logins go via path 1.
      user = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: profile.googleId },
      });
      await this.recordAuthEvent('USER_LOGIN', user.id, {});
      return user;
    }

    // 3. Brand new user — create a Google-provider account.
    user = await this.prisma.user.create({
      data: {
        email,
        displayName: profile.displayName,
        googleId: profile.googleId,
        authProvider: 'GOOGLE',
        isEmailVerified: true, // Google already verified the address
        passwordHash: null,
      },
    });
    await this.recordAuthEvent('USER_REGISTER', user.id, {});
    return user;
  }

  /**
   * Issues a short-lived (30 s) one-time exchange code after Google OAuth
   * succeeds. The Next.js callback page redeems it for a real token pair via
   * `POST /auth/exchange`. Codes are purged by the daily cleanup cron.
   */
  async createExchangeCode(userId: string): Promise<string> {
    const code = generateRefreshToken(); // 48 bytes of crypto-random hex
    const expiresAt = new Date(Date.now() + OAUTH_EXCHANGE_CODE_TTL_SECONDS * 1_000);
    await this.prisma.oAuthExchangeCode.create({ data: { userId, code, expiresAt } });
    return code;
  }

  /**
   * Redeems an exchange code and issues a full access+refresh token pair.
   * The code is marked used on first call; replays are rejected.
   */
  async redeemExchangeCode(code: string, deviceMeta: DeviceMeta = {}) {
    const record = await this.prisma.oAuthExchangeCode.findUnique({ where: { code } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Exchange code is invalid or has expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account not found or inactive');

    await this.prisma.$transaction([
      this.prisma.oAuthExchangeCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    await this.recordAuthEvent('USER_LOGIN', user.id, deviceMeta);

    const tokens = await this.issueTokens(
      { sub: user.id, email: user.email, role: user.role },
      deviceMeta,
    );
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      ...tokens,
    };
  }

  /**
   * Records a rejected login. Deliberately separate from `recordAuthEvent`
   * because the user may not exist, so `userId` can be null and the attempted
   * email goes in `meta` instead. The HTTP response is an identical generic
   * 401 either way — this trail is the only place the difference is visible.
   */
  private async recordFailedLogin(
    userId: string | undefined,
    email: string,
    deviceMeta: DeviceMeta,
  ) {
    await this.prisma.auditEvent.create({
      data: {
        action: 'USER_LOGIN_FAILED',
        userId: userId ?? null,
        entityType: 'User',
        entityId: userId ?? null,
        meta: { email, reason: userId ? 'bad_password_or_inactive' : 'unknown_email' },
        ipAddress: deviceMeta.ipAddress,
      },
    });
  }

  /**
   * Writes an auth-lifecycle audit event. `deviceMeta.ipAddress` is already
   * captured for refresh-token rows, so it is recorded here too — the other
   * services leave `AuditEvent.ipAddress` null because they never have it.
   */
  private async recordAuthEvent(
    action: AuditAction,
    userId: string,
    deviceMeta: DeviceMeta,
  ) {
    await this.prisma.auditEvent.create({
      data: {
        action,
        userId,
        entityType: 'User',
        entityId: userId,
        ipAddress: deviceMeta.ipAddress,
      },
    });
  }

  private async findValidRefreshToken(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return record;
  }

  private async issueTokens(payload: JwtPayload, deviceMeta: DeviceMeta) {
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt,
        deviceId: deviceMeta.deviceId,
        ipAddress: deviceMeta.ipAddress,
        userAgent: deviceMeta.userAgent,
      },
    });

    return { accessToken, refreshToken };
  }
}
