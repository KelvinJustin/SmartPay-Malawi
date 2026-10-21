import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../database/database.service.js';
import { PaymentProviderRegistry } from '../payment-providers/registry/payment-provider.registry.js';
import { TransactionsService } from './transactions.service.js';
import { CheckoutTokenService } from './checkout-token.service.js';

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: DatabaseService,
          useValue: {},
        },
        {
          provide: CheckoutTokenService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn(),
          },
        },
        {
          provide: PaymentProviderRegistry,
          useValue: {
            get: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});