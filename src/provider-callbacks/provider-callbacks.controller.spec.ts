import { beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProviderCallbacksController } from './provider-callbacks.controller.js';
import { ProviderCallbacksService } from './provider-callbacks.service.js';

describe('ProviderCallbacksController', () => {
  let controller: ProviderCallbacksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderCallbacksController],
      providers: [
        {
          provide: ProviderCallbacksService,
          useValue: {
            handleCallback: () => Promise.resolve({ received: true, duplicate: false }),
          },
        },
      ],
    }).compile();

    controller = module.get<ProviderCallbacksController>(ProviderCallbacksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
