import { Module } from '@nestjs/common';
import { MerchantsService } from './merchants.service.js';
import { MerchantsController } from './merchants.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [MerchantsController],
  providers: [MerchantsService],
})
export class MerchantsModule {}