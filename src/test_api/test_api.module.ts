import { Module } from '@nestjs/common';
import { TestApiService } from './test_api.service.js';
import { TestApiController } from './test_api.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [TestApiController],
  providers: [TestApiService],
})
export class TestApiModule {}
