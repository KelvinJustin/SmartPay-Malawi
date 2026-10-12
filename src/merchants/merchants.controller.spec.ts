import { Test, TestingModule } from '@nestjs/testing';
import { MerchantsController } from './merchants.controller.js';
import { MerchantsService } from './merchants.service.js';

describe('MerchantsController', () => {
  let controller: MerchantsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantsController],
      providers: [MerchantsService],
    }).compile();

    controller = module.get<MerchantsController>(MerchantsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
