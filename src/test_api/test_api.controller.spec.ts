import { Test, TestingModule } from '@nestjs/testing';
import { TestApiController } from './test_api.controller.js';
import { TestApiService } from './test_api.service.js';

describe('TestApiController', () => {
  let controller: TestApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestApiController],
      providers: [TestApiService],
    }).compile();

    controller = module.get<TestApiController>(TestApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
