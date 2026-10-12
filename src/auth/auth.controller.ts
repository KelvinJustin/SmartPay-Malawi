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
import type { request, Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { RegisterAuthDto } from './dto/register-auth.dto.js';
import { LoginAuthDto } from './dto/login-auth.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const COOKIE_NAME = 'access_token';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginAuthDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken } = await this.authService.login(dto);

    // Store the JWT in an HttpOnly cookie instead of returning
    // the token in the JSON response body.
    response.cookie(COOKIE_NAME, accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    return { message: 'Login successful' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(
    @Req()
    request: Request & {
      user: {
        id: string;
        email: string;
      };
    },
  ) {
    return request.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    // Remove the browser cookie by expiring it.
    response.clearCookie(COOKIE_NAME, cookieOptions);

    return { message: 'Logged out successfully' };
  }
}
