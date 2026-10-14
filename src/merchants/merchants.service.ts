import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';
import { CreateProfileDto } from './dto/create-profile.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AddSettlementAccountDto } from './dto/add-settlement-account.dto.js';
import { PrismaClient, SettlementMethod } from '../generated/prisma/client.js';

@Injectable()
export class MerchantsService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ============================================================
  // PROFILE
  // ============================================================

  // Create the business profile for an authenticated merchant.
  // A merchant can only have one profile — the schema enforces this
  // with @unique on merchantId, but we give a clear error here.
  async createProfile(merchantId: string, dto: CreateProfileDto) {
    const existing = await this.databaseService.merchantProfile.findUnique({
      where: { merchantId },
    });

    if (existing) {
      throw new ConflictException('Profile already exists');
    }

    const profile = await this.databaseService.merchantProfile.create({
      data: {
        merchantId,
        ...dto,
      },
    });

    return profile;
  }

  // Fetch the profile belonging to the authenticated merchant.
  async getMyProfile(merchantId: string) {
    const profile = await this.databaseService.merchantProfile.findUnique({
      where: { merchantId },
      include: {
        documents: true,
        settlementAccounts: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  // Update allowed fields. The merchant cannot touch approval fields
  async updateProfile(merchantId: string, dto: UpdateProfileDto) {
  const profile = await this.databaseService.merchantProfile.findUnique({
    where: { merchantId },
  });

  if (!profile) {
    throw new NotFoundException('Profile not found');
  }

  return this.databaseService.merchantProfile.update({
    where: { merchantId },
    data: dto,
  });
}

  // ============================================================
  // SUBMISSION
  // ============================================================

  // Merchant says "I'm done, please review me."
  // Only allowed from PENDING_SUBMISSION or REJECTED (resubmission).
  async submitForReview(merchantId: string) {
    const profile = await this.databaseService.merchantProfile.findUnique({
      where: { merchantId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const submittableStatuses = ['PENDING_SUBMISSION', 'REJECTED'];

    if (!submittableStatuses.includes(profile.accountStatus)) {
      throw new BadRequestException(
        `Cannot submit from status: ${profile.accountStatus}`,
      );
    }

    return this.databaseService.merchantProfile.update({
      where: { merchantId },
      data: {
        accountStatus: 'SUBMITTED',
        submittedAt: new Date(),
        // Clear old rejection reason on resubmission.
        rejectionReason: null,
      },
    });
  }

  // ============================================================
  // SETTLEMENT ACCOUNTS
  // ============================================================

  async addSettlementAccount(
    merchantId: string,
    dto: AddSettlementAccountDto,
  ) {
    const profile = await this.databaseService.merchantProfile.findUnique({
      where: { merchantId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Validate that the right fields are present for the chosen method.
    // (class-validator handles this too via ValidateIf, but a service-level
    // check means the error message is clearer in logs.)
    if (
      dto.method === SettlementMethod.BANK_TRANSFER &&
      (!dto.bankName || !dto.accountName || !dto.accountNumber)
    ) {
      throw new BadRequestException(
        'bankName, accountName, and accountNumber are required for bank transfers',
      );
    }

    if (
      (dto.method === SettlementMethod.AIRTEL_MONEY ||
        dto.method === SettlementMethod.TNM_MPAMBA) &&
      !dto.phoneNumber
    ) {
      throw new BadRequestException(
        'phoneNumber is required for mobile money accounts',
      );
    }

    // If this account is being set as primary, demote all existing ones first.
    if (dto.isPrimary) {
      await this.databaseService.settlementAccount.updateMany({
        where: { profileId: profile.id },
        data: { isPrimary: false },
      });
    }

    return this.databaseService.settlementAccount.create({
      data: {
        profileId: profile.id,
        ...dto,
      },
    });
  }

  async getSettlementAccounts(merchantId: string) {
    const profile = await this.databaseService.merchantProfile.findUnique({
      where: { merchantId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.databaseService.settlementAccount.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeSettlementAccount(merchantId: string, accountId: string) {
    const profile = await this.databaseService.merchantProfile.findUnique({
      where: { merchantId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const account = await this.databaseService.settlementAccount.findFirst({
      where: {
        id: accountId,
        profileId: profile.id, // ensures the account belongs to this merchant
      },
    });

    if (!account) {
      throw new NotFoundException('Settlement account not found');
    }

    await this.databaseService.settlementAccount.delete({
      where: { id: accountId },
    });

    return { message: 'Settlement account removed' };
  }
}