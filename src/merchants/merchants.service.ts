import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AddSettlementAccountDto } from './dto/add-settlement-account.dto.js';
import { SettlementMethod, AccountStatus, DocumentType } from '../generated/prisma/enums.js';

@Injectable()
export class MerchantsService {
  constructor(private readonly databaseService: DatabaseService) { }

  // ============================================================
  // PROFILE
  // ============================================================

  // Every merchant gets a blank profile automatically at registration.
  // This method simply fetches it along with their documents and
  // settlement accounts so the frontend has everything in one call.
  async getMyProfile(merchantId: string) {
    const profile = await this.databaseService.merchantProfile.findUnique({
      where: { merchantId },
      include: {
        documents: true,
        settlementAccounts: true,
      },
    });

    // This should never happen in normal operation because registration
    // creates the profile in the same transaction. If it does, it means
    // the registration transaction was interrupted — worth investigating.
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  // Merchants can update their business details at any time.
  // The only fields they cannot touch are approval fields
  // (accountStatus, approvedAt, approvedById, rejectionReason) —
  // those are managed exclusively by admins.
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

  // The merchant calls this when they believe their profile and documents
  // are complete and ready for admin review. This is the handoff point —
  // after this, the ball is in the admin's court.
  //
  // Allowed from:
  //   PENDING_SUBMISSION → first-time submission
  //   REJECTED           → resubmission after fixing issues flagged by admin
  //
  // The required documents check ensures the merchant can't submit with
  // missing identity verification. Required documents vary by business type:
  //   INDIVIDUAL      → NATIONAL_ID_FRONT, NATIONAL_ID_BACK
  //   SOLE_TRADER     → NATIONAL_ID_FRONT, NATIONAL_ID_BACK, PROOF_OF_ADDRESS
  //   PARTNERSHIP     → BUSINESS_REGISTRATION, DIRECTOR_ID
  //   LIMITED_COMPANY → BUSINESS_REGISTRATION, TAX_CERTIFICATE, DIRECTOR_ID
  //   NGO             → BUSINESS_REGISTRATION, TAX_CERTIFICATE
  private readonly requiredDocuments: Record<string, string[]> = {
    INDIVIDUAL: ['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK'],
    SOLE_TRADER: ['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'PROOF_OF_ADDRESS'],
    PARTNERSHIP: ['BUSINESS_REGISTRATION', 'DIRECTOR_ID'],
    LIMITED_COMPANY: ['BUSINESS_REGISTRATION', 'TAX_CERTIFICATE', 'DIRECTOR_ID'],
    NGO: ['BUSINESS_REGISTRATION', 'TAX_CERTIFICATE'],
  };

  async submitForReview(merchantId: string) {
    const profile = await this.databaseService.merchantProfile.findUnique({
      where: { merchantId },
      include: { documents: true },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const submittableStatuses = ['PENDING_SUBMISSION', 'REJECTED'];

    if (!submittableStatuses.includes(profile.accountStatus)) {
      throw new BadRequestException(
        `Cannot submit from status: ${profile.accountStatus}. ` +
        `Submission is only allowed from PENDING_SUBMISSION or REJECTED.`,
      );
    }

    // Only count documents that are not rejected — a rejected document
    // must be re-uploaded before the merchant can resubmit.
    const uploadedTypes = profile.documents
      .filter((doc) => doc.status !== 'REJECTED')
      .map((doc) => doc.type);

    const required = this.requiredDocuments[profile.businessType] ?? [];

    const missing = required.filter((type) => !uploadedTypes.includes(type as DocumentType));

    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot submit. The following required documents are missing or rejected: ` +
        `${missing.join(', ')}.`,
      );
    }

    // Clear the old rejection reason on resubmission so the admin
    // sees a clean slate and isn't confused by stale feedback.
    return this.databaseService.merchantProfile.update({
      where: { merchantId },
      data: {
        accountStatus: 'SUBMITTED',
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });
  }

  // ============================================================
  // SETTLEMENT ACCOUNTS
  // ============================================================

  // Returns all settlement accounts for the merchant, ordered by
  // creation date so the primary account (set first) appears at the top.
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

  // Adds a new payout destination for the merchant.
  // The method field drives which other fields are required:
  //   AIRTEL_MONEY / TNM_MPAMBA → phoneNumber
  //   BANK_TRANSFER             → bankName, accountName, accountNumber
  //
  // If isPrimary is true, all existing accounts are demoted first
  // so there is always exactly one primary account.
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

    if (
      dto.method === SettlementMethod.BANK_TRANSFER &&
      (!dto.bankName || !dto.accountName || !dto.accountNumber)
    ) {
      throw new BadRequestException(
        'Bank transfers require bankName, accountName, and accountNumber.',
      );
    }

    if (
      (dto.method === SettlementMethod.AIRTEL_MONEY ||
        dto.method === SettlementMethod.TNM_MPAMBA) &&
      !dto.phoneNumber
    ) {
      throw new BadRequestException(
        'Mobile money accounts require a phoneNumber.',
      );
    }

    // Demote all existing accounts before setting this one as primary.
    // This runs as a separate query before the insert — not in a
    // transaction — because a partial failure here (demote succeeds,
    // insert fails) still leaves a valid state (no primary), which is
    // safer than leaving two primaries.
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

  // Removes a settlement account. The profileId check ensures a merchant
  // can only delete their own accounts — they cannot delete another
  // merchant's account even if they somehow know the accountId.
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
        profileId: profile.id,
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