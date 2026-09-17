import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigService } from '@nestjs/config';
import { AuthService, DeviceMeta } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import type { User } from '@prisma/client';
import { PROFILE_PICTURE_MAX_SIZE_BYTES, PROFILE_PICTURE_MIME_TYPES } from '../media/media.constants';

function deviceMetaFrom(req: Request): DeviceMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, deviceMetaFrom(req));
  }

  // The brute-force surface. 5 attempts per minute per IP.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, deviceMetaFrom(req));
  }

  // Legitimate clients refresh every ~15 minutes, so this is generous while
  // still capping token-guessing.
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, deviceMetaFrom(req));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    await this.authService.logout(dto.refreshToken, deviceMetaFrom(req));
    return { success: true };
  }

  @Get('profile')
  profile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.sub, dto);
  }

  @Post('profile/picture')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('picture', {
      storage: memoryStorage(),
      limits: { fileSize: PROFILE_PICTURE_MAX_SIZE_BYTES },
      fileFilter(_req, file, cb) {
        if ((PROFILE_PICTURE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Profile pictures must be JPG, PNG, or WebP images.'), false);
        }
      },
    }),
  )
  uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Choose a JPG, PNG, or WebP image to upload.');
    return this.authService.updateProfilePicture(user.sub, file);
  }

  @Delete('profile/picture')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeProfilePicture(@CurrentUser() user: JwtPayload) {
    return this.authService.removeProfilePicture(user.sub);
  }

  @Patch('password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.changePassword(user.sub, dto, deviceMetaFrom(req));
  }

  // Throttled tightly — this triggers email delivery and is a prime abuse vector.
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto, deviceMetaFrom(req));
  }

  @Post('send-verification')
  sendVerification(@CurrentUser() user: JwtPayload) {
    return this.authService.sendVerificationEmail(user.sub);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    return this.authService.verifyEmail(dto, deviceMetaFrom(req));
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────────

  /** Step 1 — redirect the browser to Google's consent screen. */
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport intercepts this and issues the redirect — the method body is
    // never reached.
  }

  /**
   * Step 2 — Google redirects here after the user consents.
   * Passport validates the code, calls GoogleStrategy.validate, and sets
   * req.user. We then issue a 30-second exchange code and redirect the browser
   * to the Next.js /auth/callback page which redeems it for real tokens.
   *
   * On failure Passport throws, which results in a 401 response — the user
   * can navigate back to /login and try again.
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request & { user: User }, @Res() res: Response) {
    try {
      const code = await this.authService.createExchangeCode(req.user.id);
      const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
      return res.redirect(`${appUrl}/auth/callback?code=${encodeURIComponent(code)}`);
    } catch {
      const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
      return res.redirect(
        `${appUrl}/login?error=${encodeURIComponent('Sign in with Google failed')}`,
      );
    }
  }

  /**
   * Step 3 — the Next.js /auth/callback page POSTs the exchange code here.
   * Returns the same {accessToken, refreshToken, user} shape as /login.
   */
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('exchange')
  exchange(@Body() dto: ExchangeCodeDto, @Req() req: Request) {
    return this.authService.redeemExchangeCode(dto.code, deviceMetaFrom(req));
  }
}
