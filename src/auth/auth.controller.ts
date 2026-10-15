// Decorators and helpers imported from NestJS core.
import {
  Body,        // Extracts and validates the request body (piped into a DTO).
  Controller, // Marks this class as a route controller.
  Delete,
  Get,         // HTTP GET method decorator.
  HttpCode,    // Overrides the default HTTP status code a route returns.
  HttpStatus,  // Enum of standard status codes (200, 201, 429...).
  Post,        // HTTP POST method decorator.
  Req,         // Injects the raw Express request object.
  Res,         // Injects the raw Express response object.
  UseGuards,   // Attaches guard classes that run BEFORE the route handler.
} from '@nestjs/common';
import type { Request, Response } from 'express'; // Express types for raw req/res.

// The service holding the actual authentication business logic.
import { AuthService } from './auth.service.js';
// Current user decorator for extracting the user from the request.
import { CurrentUser } from './current-user.decorator.js';
// DTOs (Data Transfer Objects): define the shape + validation rules for
// each endpoint's request body. class-validator runs on these automatically.
import { RegisterAuthDto } from './dto/register-auth.dto.js';
import { LoginAuthDto } from './dto/login-auth.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { VerifyLoginDto } from './dto/verify-login.dto.js';
// Guards: JwtAuthGuard checks the JWT cookie; ArcjetGuard blocks bots/abuse.
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { ArcjetGuard } from '../arcjet/arcjet.guard.js';

// Name of the cookie used to store the JWT. Defined once so "set" and
// "clear" can never drift apart and leave a stale cookie behind.
const COOKIE_NAME = 'access_token';

// Shared settings for creating and clearing the authentication cookie.
const cookieOptions = {
  // httpOnly: true → the cookie is invisible to JavaScript (document.cookie).
  // This is the key defense against XSS token theft — an injected script
  // can't read it and exfiltrate it to an attacker's server.
  httpOnly: true,

  // secure: true only in production → cookie travels ONLY over HTTPS.
  // In dev (http://localhost) this must stay false or the browser
  // refuses to send the cookie back at all.
  secure: process.env.NODE_ENV === 'production',

  // sameSite: 'lax' → the cookie is sent on top-level navigations and
  // same-site requests, but NOT on cross-site POSTs. Blocks CSRF on state
  // changes (logouts, profile edits) without breaking normal links.
  // `as const` pins the literal type so TypeScript doesn't widen it to string.
  sameSite: 'lax' as const,

  // path: '/' → the cookie is valid for the ENTIRE site. Required so that
  // clearCookie() here can delete a cookie that may have been set from
  // any other route.
  path: '/',
};

// @Controller('auth') → every route in this class is prefixed with /auth,
// so @Post('login') becomes POST /auth/login.
@Controller('auth')
// ArcjetGuard runs FIRST for every route below: it checks the request
// against Arcjet's rules (shield, bot detection, rate limit) and throws
// 429/403 before the handler ever runs if anything looks malicious.
// ⚠️ Note: a @UseGuards on an INDIVIDUAL route below REPLACES this
// controller-level guard for that route (see getProfile).
@UseGuards(ArcjetGuard)
export class AuthController {
  // NestJS sees the AuthService type here, finds it in AuthModule's
  // providers/exports, and injects the singleton instance.
  constructor(private readonly authService: AuthService) { }

  // POST /auth/register — create a new merchant account.
  // @Body() pipes the JSON body through RegisterAuthDto's validation
  // (email format, password strength, etc.) BEFORE this method runs;
  // invalid payloads get a 400 automatically.
  @Post('register')
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  // POST /auth/login — step 1 of 2: validate email/password, then email
  // a one-time login code to the merchant. No token is issued here yet.
  @Post('login')
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto);
  }

  // POST /auth/verify-login — step 2: check the emailed OTP. Only if the
  // code matches does AuthService set the access_token cookie.
  // ⚠️ This is a brute-force target — that's why ArcjetGuard's rate limit
  // (60/min/IP) protects it. Consider a stricter slidingWindow rule later.
  @Post('verify-login')
  verifyLogin(@Body() dto: VerifyLoginDto) {
    return this.authService.verifyLogin(dto);
  }

  // POST /auth/verify-email — verify ownership of the email address
  // (link/code from the registration confirmation email).
  // ⚠️ Caveat: if this endpoint is reached via a GET link in an email,
  // corporate mail scanners pre-fetch links and may trip detectBot.
  // That flow should use Arcjet's email-validation instead of bot rules.
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  // GET /auth/me — return the currently logged-in user's identity.
  //
  // IMPORTANT: this route-level @UseGuards REPLACES the controller-level
  // ArcjetGuard for this route. Right now /auth/me is only protected by
  // JwtAuthGuard. To protect it with BOTH, stack them:
  //   @UseGuards(ArcjetGuard, JwtAuthGuard)
  // (order matters: guards run left-to-right, so Arcjet cheaply rejects
  // abusive traffic before the more expensive JWT verification runs).
  @Get('me')
  @UseGuards(ArcjetGuard, JwtAuthGuard)
  getProfile(
    // The intersection type Request & { user: ... } reflects what the JWT
    // strategy does: it decodes the token and ATTACHES the payload to
    // request.user during the guard phase, so by the time this handler
    // runs, request.user is guaranteed to exist (the guard already 401'd
    // otherwise).
    @Req()
    request: Request & {
      user: {
        userId: string;
        email: string;
      };
    },
  ) {
    // Just hand back the identity the JWT strategy stamped on the request.
    return request.user;
  }

  // POST /auth/logout.
  // @HttpCode(200): POST would normally return 201 Created, but nothing
  // is being created — a logout is an action, so 200 OK is more correct.
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Req()
    request: Request & {
      user: {
        userId: string;
        email: string;
      };
    },
    @Res({ passthrough: true }) response: Response,
  ) {
    // @Res({ passthrough: true }) injects the Express response so we can
    // clear the cookie, BUT passthrough tells Nest to still serialize the
    // returned object as JSON. Without passthrough, returning an object
    // here would be ignored (and the response left hanging).
    response.clearCookie(COOKIE_NAME, cookieOptions);

    // Confirmation body — serialized to JSON because of passthrough: true.
    return { message: 'Logged out successfully' };
  }

  // DELETE /auth/account
  // Soft-deletes the authenticated merchant's account.
  // The JWT is still valid until it expires — the strategy's
  // deletedAt check blocks any further use immediately.
  @UseGuards(JwtAuthGuard)
  @Delete('account')
  deleteAccount(@CurrentUser() user: { userId: string }) {
    return this.authService.deleteAccount(user.userId);
  }

}