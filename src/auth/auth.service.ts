import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import { DatabaseService } from '../database/database.service.js';
import { EmailService } from '../email/email.service.js';

import { LoginAuthDto } from './dto/login-auth.dto.js';
import { RegisterAuthDto } from './dto/register-auth.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { VerifyLoginDto } from './dto/verify-login.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';

@Injectable()
export class AuthService {
  // Injected services: database access, JWT signing, transactional email,
  // and typed config (secrets never live in source).
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  // SHARED OTP UTILITIES
  // ============================================================

  // OTPs are never stored in plaintext — only this keyed HMAC hash.
  // Binding merchantId into the input means a hash stolen from one account
  // can't be replayed against another (no cross-account code reuse).
  private hashOtp(merchantId: string, code: string): string {
    return createHmac(
      'sha256',
      this.configService.getOrThrow<string>('OTP_SECRET'),
    )
      .update(`${merchantId}:${code}`)
      .digest('hex');
  }

  // ============================================================
  // MERCHANT REGISTRATION
  // ============================================================

  async register(registerAuthDto: RegisterAuthDto) {
    const { name, email, password, phone } = registerAuthDto;

    // One check covers both unique fields; a match on either blocks signup.
    const existingUser = await this.databaseService.merchant.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Email or phone number is already registered',
      );
    }

    // bcrypt stores the salt inside the hash, so cost comes from the env.
    // Note: the rounds value must be an integer — bcrypt throws on a
    // non-numeric value like an empty string.
    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.ENCRYPTION_SALT),
    );

    const user = await this.databaseService.merchant.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        phone,
      },
    });

    // cryptographically secure 6-digit code (randomInt, never Math.random)
    const code = randomInt(0, 1_000_000)
      .toString()
      .padStart(6, '0');

    // Codes live for 10 minutes.
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Persist the hash, not the code — a DB leak must not reveal live OTPs.
    await this.databaseService.otpChallenge.create({
      data: {
        merchantId: user.id,
        purpose: 'EMAIL_VERIFICATION',
        codeHash: this.hashOtp(user.id, code),
        expiresAt,
      },
    });

    // Registration isn't complete until this code is verified.
    await this.emailService.sendVerificationCode(user.email, code);

    return {
      message:
        'Registration successful. Check your email for the verification code.',
      email: user.email,
    };
  }

  // ============================================================
  // MERCHANT LOGIN — FIRST FACTOR
  // ============================================================

  async login(loginAuthDto: LoginAuthDto) {
    const { email, password } = loginAuthDto;

    const user = await this.databaseService.merchant.findUnique({
      where: { email },
    });

    // Deliberately identical messages for "no account" and "wrong password":
    // distinguishing them would let attackers enumerate registered emails.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Password alone is never enough — verified email is required first.
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    // Retire any outstanding LOGIN codes so only the newest one can win.
    await this.databaseService.otpChallenge.updateMany({
      where: {
        merchantId: user.id,
        purpose: 'LOGIN',
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    // Fresh 6-digit code for the second factor.
    const code = randomInt(0, 1_000_000)
      .toString()
      .padStart(6, '0');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Write the challenge first; the try/catch below handles send failure.
    const challenge = await this.databaseService.otpChallenge.create({
      data: {
        merchantId: user.id,
        purpose: 'LOGIN',
        codeHash: this.hashOtp(user.id, code),
        expiresAt,
      },
    });

    try {
      await this.emailService.sendLoginCode(user.email, code);
    } catch {
      // SMTP failed → burn the code so it can never be verified later.
      await this.databaseService.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });

      throw new ServiceUnavailableException(
        'Unable to send the login verification code. Please try again.',
      );
    }

    // No token here — the JWT is minted only in verifyLogin, after both factors pass.
    return {
      message: 'Login verification code sent',
      email: user.email,
    };
  }

  // ============================================================
  // MERCHANT LOGIN — SECOND FACTOR
  // ============================================================

  async verifyLogin(dto: VerifyLoginDto) {
    const { email, code } = dto;

    const merchant = await this.databaseService.merchant.findUnique({
      where: { email },
    });

    // Same generic failure message throughout this method — a verifier must
    // never reveal whether the account, the challenge, or the code was wrong.
    if (!merchant || !merchant.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Invalid or expired login verification code',
      );
    }

    // Newest unused LOGIN challenge only; older ones were retired in login().
    const challenge = await this.databaseService.otpChallenge.findFirst({
      where: {
        merchantId: merchant.id,
        purpose: 'LOGIN',
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Gate on existence, expiry, and the 5-attempt lock before any hashing.
    if (
      !challenge ||
      challenge.expiresAt.getTime() <= Date.now() ||
      challenge.attempts >= 5
    ) {
      throw new UnauthorizedException(
        'Invalid or expired login verification code',
      );
    }

    const submittedHash = this.hashOtp(merchant.id, code);

    // timingSafeEqual: equal-length buffers compared in constant time,
    // so response time can't leak how much of the hash matched.
    const matches = timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(challenge.codeHash, 'hex'),
    );

    if (!matches) {
      // The guarded where-clause keeps attempts from climbing past 5 and
      // skips challenges already consumed by a racing request.
      await this.databaseService.otpChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          attempts: { lt: 5 },
          expiresAt: { gt: new Date() },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      throw new UnauthorizedException(
        'Invalid or expired login verification code',
      );
    }

    // Atomic consume: the conditional where-clause (unconsumed, unlocked,
    // unexpired, hash matches) means a concurrent twin request updating the
    // same row makes count = 0 for the loser — one code, one redemption.
    const consumed = await this.databaseService.otpChallenge.updateMany({
      where: {
        id: challenge.id,
        codeHash: submittedHash,
        consumedAt: null,
        attempts: { lt: 5 },
        expiresAt: { gt: new Date() },
      },
      data: {
        consumedAt: new Date(),
      },
    });

    if (consumed.count !== 1) {
      // Lost the race or the challenge was invalidated between read and write.
      throw new UnauthorizedException(
        'Invalid or expired login verification code',
      );
    }

    
    // Both factors passed — now (and only now) issue the token.
    // The jti uniquely identifies this individual JWT for server-side revocation.
    const payload = {
      sub: merchant.id,
      email: merchant.email,
      jti: randomUUID(),
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }

  // ============================================================
  // EMAIL VERIFICATION
  // ============================================================

  async verifyEmail(dto: VerifyEmailDto) {
    const { email, code } = dto;

    const merchant = await this.databaseService.merchant.findUnique({
      where: { email },
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    // Idempotent success — re-verifying an already-verified email is fine.
    if (merchant.emailVerifiedAt) {
      return { message: 'Email is already verified' };
    }

    const challenge = await this.databaseService.otpChallenge.findFirst({
      where: {
        merchantId: merchant.id,
        purpose: 'EMAIL_VERIFICATION',
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !challenge ||
      challenge.expiresAt.getTime() <= Date.now() ||
      challenge.attempts >= 5
    ) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const submittedHash = this.hashOtp(merchant.id, code);

    const matches = timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(challenge.codeHash, 'hex'),
    );

    if (!matches) {
      // ⚠️ Unlike verifyLogin, this uses update() without guards — a request
      // racing a successful verify could still push attempts past 5 on a
      // consumed row (harmless but noisy). Prefer the guarded updateMany()
      // pattern from verifyLogin for symmetry.
      await this.databaseService.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });

      throw new UnauthorizedException('Invalid or expired verification code');
    }

    // Transaction: consume the code and flip the flag together — a crash
    // midway can't leave "verified but code still redeemable" (or vice versa).
    await this.databaseService.$transaction([
      this.databaseService.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
      this.databaseService.merchant.update({
        where: { id: merchant.id },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  async logout(user: {
  userId: string;
  jti: string;
  exp: number;
}) {
  await this.databaseService.revokedToken.create({
    data: {
      jti: user.jti,
      merchantId: user.userId,
      expiresAt: new Date(user.exp * 1000),
    },
  });

  return { message: 'Logged out successfully' };
}

  // ============================================================
  // GENERATED NESTJS PLACEHOLDERS — safe to delete if unused
  // ============================================================

  // TODO: Replace this scaffold with the actual update operation when needed.
  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  // TODO: Replace this scaffold with the actual deletion operation when needed.
  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
