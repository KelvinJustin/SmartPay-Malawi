import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { RegisterAuthDto } from './dto/register-auth.dto.js';
import { LoginAuthDto } from './dto/login-auth.dto.js';
import { UpdateAuthDto } from './dto/update-auth.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { DatabaseService } from '../database/database.service.js';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service.js';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';


// @Injectable() tells NestJS that this class can be managed by its
// dependency injection system and injected into other classes.
@Injectable()
export class AuthService {

  // Dependency injection:
  // DatabaseService provides access to the database through Prisma.
  // JwtService handles creating and signing JSON Web Tokens.
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) { }


  private hashOtp(merchantId: string, code: string): string {
    return createHmac(
      'sha256',
      this.configService.getOrThrow<string>('OTP_SECRET'),
    )
      .update(`${merchantId}:${code}`)
      .digest('hex');
  }


  // ============================================================
  // REGISTER A NEW MERCHANT
  // ============================================================


  async register(registerAuthDto: RegisterAuthDto) {
    const { name, email, password, phone } = registerAuthDto;

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

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.ENCYPTION_SALT),
    );

    const user = await this.databaseService.merchant.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        phone,
      },
    });

    const code = randomInt(0, 1_000_000)
      .toString()
      .padStart(6, '0');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.databaseService.otpChallenge.create({
      data: {
        merchantId: user.id,
        purpose: 'EMAIL_VERIFICATION',
        codeHash: this.hashOtp(user.id, code),
        expiresAt,
      },
    });

    await this.emailService.sendVerificationCode(user.email, code);

    return {
      message: 'Registration successful. Check your email for the verification code.',
      email: user.email,
    };
  }


  // ============================================================
  // LOG IN AN EXISTING MERCHANT
  // ============================================================

  // LoginAuthDto defines the expected login data, typically email
  // and password.
  async login(loginAuthDto: LoginAuthDto) {

    // Extract the email and password supplied by the client.
    const { email, password } = loginAuthDto;

    // Search the database for a merchant with the supplied email.
    const user = await this.databaseService.merchant.findUnique({
      where: { email },
    });

    // ------------------------------------------------------------
    // ERROR HANDLING
    // ------------------------------------------------------------

    // If no merchant exists with this email, reject the login.
    // UnauthorizedException produces an HTTP 401 response.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare the submitted password with the stored bcrypt hash.
    // bcrypt.compare() handles the salt and hashing parameters encoded
    // in the stored hash; you do not hash the submitted password manually.
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    // If the passwords do not match, reject the login.
    // The same error message is used for an unknown email and an incorrect
    // password to avoid revealing which credential was wrong.
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    // ------------------------------------------------------------
    // GENERATE THE JWT ACCESS TOKEN
    // ------------------------------------------------------------

    // The JWT payload contains information identifying the merchant.
    // "sub" means subject: the ID of the account the token represents.
    // The email is included as an additional claim.
    const payload = { sub: user.id, email: user.email };

    // signAsync() creates and signs the JWT using the configuration
    // supplied to JwtModule, including its signing secret and any
    // configured expiration time.
    // The token allows the client to authenticate future requests.
    return {
      accessToken: await this.jwtService.signAsync(payload)
    };
  }

  //verify email

  async verifyEmail(dto: VerifyEmailDto) {
    const { email, code } = dto;

    const merchant = await this.databaseService.merchant.findUnique({
      where: { email },
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

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
      await this.databaseService.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });

      throw new UnauthorizedException('Invalid or expired verification code');
    }

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
  // LOGOUT A LOOGED IN USER - REMOVE PERSISTENCE BY BLACKLISTING THE TOKEN AND 
  //=============================================================

  async logout() {
    return "Logout successfully"
  }

  // ============================================================
  // UPDATE AN AUTH RECORD — GENERATED PLACEHOLDER
  // ============================================================

  // This method is currently a NestJS scaffold.
  // It does not update any database record; it only returns a string.
  // The id parameter identifies the record in the intended implementation.
  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  // ============================================================
  // REMOVE AN AUTH RECORD — GENERATED PLACEHOLDER
  // ============================================================

  // This method is also a scaffold.
  // It does not delete anything from the database yet.
  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}

// osadabwa the comments are AI generated. I aint that creative 😂