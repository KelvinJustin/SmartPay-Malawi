import { Test, TestingModule } from '@nestjs/testing';
import { EndpointerController } from './endpointer.controller.js';
import { EndpointerService } from './endpointer.service.js';

describe('EndpointerController', () => {
  let controller: EndpointerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EndpointerController],
      providers: [EndpointerService],
    }).compile();

    controller = module.get<EndpointerController>(EndpointerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
