import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { MerchantsService } from './merchants.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  // ============================================================
  // PROFILE
  // ============================================================

  // GET /merchants/profile
  @Get('profile')
  getMyProfile(@CurrentUser('userId') merchantId: string) {
    return this.merchantsService.getMyProfile(merchantId);
  }

  // PATCH /merchants/profile
  @Patch('profile')
  updateProfile(
    @CurrentUser('userId') merchantId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.merchantsService.updateProfile(merchantId, dto);
  }

  // ============================================================
  // SUBMISSION
  // ============================================================

  // POST /merchants/profile/submit
  @Post('profile/submit')
  submitForReview(@CurrentUser('userId') merchantId: string) {
    return this.merchantsService.submitForReview(merchantId);
  }
}