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
import { CreateProfileDto } from './dto/create-profile.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AddSettlementAccountDto } from './dto/add-settlement-account.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  // ============================================================
  // PROFILE
  // ============================================================

  // POST /merchants/profile
  @Post('profile')
  createProfile(
    @CurrentUser('userId') merchantId: string,
    @Body() dto: CreateProfileDto,
  ) {
    return this.merchantsService.createProfile(merchantId, dto);
  }

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

  // ============================================================
  // SETTLEMENT ACCOUNTS
  // ============================================================

  // GET /merchants/settlement-accounts
  @Get('settlement-accounts')
  getSettlementAccounts(@CurrentUser('userId') merchantId: string) {
    return this.merchantsService.getSettlementAccounts(merchantId);
  }

  // POST /merchants/settlement-accounts
  @Post('settlement-accounts')
  addSettlementAccount(
    @CurrentUser('userId') merchantId: string,
    @Body() dto: AddSettlementAccountDto,
  ) {
    return this.merchantsService.addSettlementAccount(merchantId, dto);
  }

  // DELETE /merchants/settlement-accounts/:id
  @Delete('settlement-accounts/:id')
  removeSettlementAccount(
    @CurrentUser('userId') merchantId: string,
    @Param('id') accountId: string,
  ) {
    return this.merchantsService.removeSettlementAccount(merchantId, accountId);
  }
}