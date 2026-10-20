import { beforeEach, describe, expect, it} from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';

import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

describe('TransactionsController', () => {
  let controller: TransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(
      TransactionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});