import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import {
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';

import { MerchantsService } from './merchants.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

describe('MerchantsService', () => {
    let service: MerchantsService;

    const mockDatabaseService = {
        merchantProfile: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    };

    const MERCHANT_ID = '123e4567-e89b-42d3-a456-426614174000';

    const mockProfile = {
        id: 'profile-uuid',
        merchantId: MERCHANT_ID,
        businessType: 'INDIVIDUAL',
        accountStatus: 'PENDING_SUBMISSION',
        submittedAt: null,
        rejectionReason: null,
        documents: [],
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MerchantsService,
                {
                    provide: DatabaseService,
                    useValue: mockDatabaseService,
                },
            ],
        }).compile();

        service = module.get<MerchantsService>(MerchantsService);
    });

    describe('initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });
    });

    describe('getMyProfile', () => {
        it('should return the profile and its documents', async () => {
            const profile = {
                ...mockProfile,
                documents: [{ id: 'document-1', type: 'NATIONAL_ID_FRONT' }],
            };

            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue(profile);

            await expect(service.getMyProfile(MERCHANT_ID)).resolves.toEqual(profile);

            expect(mockDatabaseService.merchantProfile.findUnique).toHaveBeenCalledWith({
                where: { merchantId: MERCHANT_ID },
                include: { documents: true },
            });
        });

        it('should throw NotFoundException when the profile does not exist', async () => {
            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue(null);

            await expect(service.getMyProfile(MERCHANT_ID)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should propagate database errors', async () => {
            mockDatabaseService.merchantProfile.findUnique.mockRejectedValue(
                new Error('Database unavailable'),
            );

            await expect(service.getMyProfile(MERCHANT_ID)).rejects.toThrow(
                'Database unavailable',
            );
        });
    });

    describe('updateProfile', () => {
        const dto = {
            businessName: 'Updated Business',
        } as UpdateProfileDto;

        it('should update an existing profile', async () => {
            const updatedProfile = {
                ...mockProfile,
                ...dto,
            };

            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue(mockProfile);
            mockDatabaseService.merchantProfile.update.mockResolvedValue(updatedProfile);

            await expect(
                service.updateProfile(MERCHANT_ID, dto),
            ).resolves.toEqual(updatedProfile);

            expect(mockDatabaseService.merchantProfile.findUnique).toHaveBeenCalledWith({
                where: { merchantId: MERCHANT_ID },
            });

            expect(mockDatabaseService.merchantProfile.update).toHaveBeenCalledWith({
                where: { merchantId: MERCHANT_ID },
                data: dto,
            });
        });

        it('should throw NotFoundException when the profile does not exist', async () => {
            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue(null);

            await expect(
                service.updateProfile(MERCHANT_ID, dto),
            ).rejects.toThrow(NotFoundException);

            expect(mockDatabaseService.merchantProfile.update).not.toHaveBeenCalled();
        });

        it('should propagate database errors', async () => {
            mockDatabaseService.merchantProfile.findUnique.mockRejectedValue(
                new Error('Database unavailable'),
            );

            await expect(
                service.updateProfile(MERCHANT_ID, dto),
            ).rejects.toThrow('Database unavailable');
        });
    });

    describe('submitForReview', () => {
        it('should submit an individual profile with all required documents', async () => {
            const profile = {
                ...mockProfile,
                businessType: 'INDIVIDUAL',
                documents: [
                    { type: 'NATIONAL_ID_FRONT', status: 'APPROVED' },
                    { type: 'NATIONAL_ID_BACK', status: 'PENDING' },
                ],
            };

            const submittedProfile = {
                ...profile,
                accountStatus: 'SUBMITTED',
                submittedAt: new Date(),
                rejectionReason: null,
            };

            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue(profile);
            mockDatabaseService.merchantProfile.update.mockResolvedValue(submittedProfile);

            const result = await service.submitForReview(MERCHANT_ID);

            expect(result).toEqual(submittedProfile);
            expect(mockDatabaseService.merchantProfile.findUnique).toHaveBeenCalledWith({
                where: { merchantId: MERCHANT_ID },
                include: { documents: true },
            });

            expect(mockDatabaseService.merchantProfile.update).toHaveBeenCalledWith({
                where: { merchantId: MERCHANT_ID },
                data: {
                    accountStatus: 'SUBMITTED',
                    submittedAt: expect.any(Date),
                    rejectionReason: null,
                },
            });
        });

        it('should allow resubmission of a rejected profile', async () => {
            const profile = {
                ...mockProfile,
                accountStatus: 'REJECTED',
                rejectionReason: 'Please provide corrected documents',
                documents: [
                    { type: 'NATIONAL_ID_FRONT', status: 'APPROVED' },
                    { type: 'NATIONAL_ID_BACK', status: 'PENDING' },
                ],
            };

            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue(profile);
            mockDatabaseService.merchantProfile.update.mockResolvedValue({
                ...profile,
                accountStatus: 'SUBMITTED',
                rejectionReason: null,
            });

            await service.submitForReview(MERCHANT_ID);

            expect(mockDatabaseService.merchantProfile.update).toHaveBeenCalledWith({
                where: { merchantId: MERCHANT_ID },
                data: {
                    accountStatus: 'SUBMITTED',
                    submittedAt: expect.any(Date),
                    rejectionReason: null,
                },
            });
        });

        it('should throw NotFoundException when the profile does not exist', async () => {
            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue(null);

            await expect(
                service.submitForReview(MERCHANT_ID),
            ).rejects.toThrow(NotFoundException);

            expect(mockDatabaseService.merchantProfile.update).not.toHaveBeenCalled();
        });

        it('should reject a profile with an invalid submission status', async () => {
            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue({
                ...mockProfile,
                accountStatus: 'SUBMITTED',
            });

            await expect(
                service.submitForReview(MERCHANT_ID),
            ).rejects.toThrow(BadRequestException);

            expect(mockDatabaseService.merchantProfile.update).not.toHaveBeenCalled();
        });

        it('should reject submission when required documents are missing', async () => {
            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue({
                ...mockProfile,
                businessType: 'INDIVIDUAL',
                documents: [
                    { type: 'NATIONAL_ID_FRONT', status: 'APPROVED' },
                ],
            });

            await expect(
                service.submitForReview(MERCHANT_ID),
            ).rejects.toThrow(/NATIONAL_ID_BACK/);

            expect(mockDatabaseService.merchantProfile.update).not.toHaveBeenCalled();
        });

        it('should treat rejected documents as missing', async () => {
            mockDatabaseService.merchantProfile.findUnique.mockResolvedValue({
                ...mockProfile,
                businessType: 'INDIVIDUAL',
                documents: [
                    { type: 'NATIONAL_ID_FRONT', status: 'REJECTED' },
                    { type: 'NATIONAL_ID_BACK', status: 'PENDING' },
                ],
            });

            await expect(
                service.submitForReview(MERCHANT_ID),
            ).rejects.toThrow(/NATIONAL_ID_FRONT/);

            expect(mockDatabaseService.merchantProfile.update).not.toHaveBeenCalled();
        });

        it.each([
            {
                businessType: 'SOLE_TRADER',
                documents: ['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK'],
                missing: 'PROOF_OF_ADDRESS',
            },
            {
                businessType: 'PARTNERSHIP',
                documents: ['BUSINESS_REGISTRATION'],
                missing: 'DIRECTOR_ID',
            },
            {
                businessType: 'LIMITED_COMPANY',
                documents: ['BUSINESS_REGISTRATION', 'DIRECTOR_ID'],
                missing: 'TAX_CERTIFICATE',
            },
            {
                businessType: 'NGO',
                documents: ['BUSINESS_REGISTRATION'],
                missing: 'TAX_CERTIFICATE',
            },
        ])(
            'should require $missing for $businessType',
            async ({ businessType, documents, missing }) => {
                mockDatabaseService.merchantProfile.findUnique.mockResolvedValue({
                    ...mockProfile,
                    businessType,
                    documents: documents.map((type) => ({
                        type,
                        status: 'PENDING',
                    })),
                });

                await expect(
                    service.submitForReview(MERCHANT_ID),
                ).rejects.toThrow(new RegExp(missing));

                expect(mockDatabaseService.merchantProfile.update).not.toHaveBeenCalled();
            },
        );

        it('should propagate database errors', async () => {
            mockDatabaseService.merchantProfile.findUnique.mockRejectedValue(
                new Error('Database unavailable'),
            );

            await expect(
                service.submitForReview(MERCHANT_ID),
            ).rejects.toThrow('Database unavailable');
        });
    });
});