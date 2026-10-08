import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("test")
  getTest(): string {
    return "message: SmartPay API is working";
  }
}
