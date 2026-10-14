import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { rawArcjetClient } from './arcjet.module.js';

@Injectable()
export class ArcjetGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Call protect directly on the raw unproxied client instance
    const decision = await rawArcjetClient.protect(request);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new HttpException(
          'Too many requests, please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (decision.reason.isBot()) {
        throw new HttpException('Bot detected.', HttpStatus.FORBIDDEN);
      }

      throw new HttpException('Request blocked.', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}