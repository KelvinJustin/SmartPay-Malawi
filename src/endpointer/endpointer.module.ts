import { Module } from '@nestjs/common';
import { EndpointerService } from './endpointer.service.js';
import { EndpointerController } from './endpointer.controller.js';

@Module({
  controllers: [EndpointerController],
  providers: [EndpointerService],
})
export class EndpointerModule {}
