import { beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProviderCallbacksService } from './provider-callbacks.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('ProviderCallbacksService', () => {
  let service: ProviderCallbacksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderCallbacksService,
        {
          provide: DatabaseService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ProviderCallbacksService>(ProviderCallbacksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
