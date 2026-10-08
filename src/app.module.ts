import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { TestApiModule } from './test_api/test_api.module.js';
import { EndpointerModule } from './endpointer/endpointer.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'smart-pay-malawi',
    }),
    DatabaseModule,
    TestApiModule,
    EndpointerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
