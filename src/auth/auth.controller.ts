import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { RegisterAuthDto } from './dto/register-auth.dto.js';
import { LoginAuthDto } from './dto/login-auth.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

// Name of the cookie used to store the JWT.
const COOKIE_NAME = 'access_token';

// Shared settings for creating and clearing the authentication cookie.
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  // Inject AuthService to handle authentication business logic.
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  // Register a new merchant using the submitted registration details.
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  // Return HTTP 200 instead of NestJS's default POST status of 201.
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginAuthDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Validate the credentials and generate an access token.
    const { accessToken } = await this.authService.login(dto);

    // Store the JWT in an HttpOnly cookie instead of returning
    // the token in the JSON response body.
    response.cookie(COOKIE_NAME, accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // Cookie expires after 15 minutes.
    });

    // Return a confirmation message without exposing the JWT.
    return { message: 'Login successful' };
  }

  @Get('me')
  // Require a valid JWT before allowing access to this endpoint.
  @UseGuards(JwtAuthGuard)
  getProfile(
    @Req()
    request: Request & {
      user: {
        userId: string;
        email: string;
      };
    },
  ) {
    // Return the authenticated user's identity attached by the JWT strategy.
    return request.user;
  }

  @Post('logout')
  // Return HTTP 200 after processing the logout request.
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    // Remove the browser cookie by expiring it.
    response.clearCookie(COOKIE_NAME, cookieOptions);

    // Confirm that the logout request was processed.
    return { message: 'Logged out successfully' };
  }
}