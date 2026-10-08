import { Test, TestingModule } from '@nestjs/testing';
import { EndpointerService } from './endpointer.service.js';

describe('EndpointerService', () => {
  let service: EndpointerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EndpointerService],
    }).compile();

    service = module.get<EndpointerService>(EndpointerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
