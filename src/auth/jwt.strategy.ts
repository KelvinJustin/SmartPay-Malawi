import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { DatabaseService } from '../database/database.service.js';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Dependency injection: configService is used to retrieve the JWT signing secret.
  constructor(
    configService: ConfigService,
    private readonly databaseService: DatabaseService,
      ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => request?.cookies?.access_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }


  async validate(payload: {
    sub: string;
    email: string;
    jti: string;
    exp: number;
  }) {
    if (!payload.sub || !payload.jti || !payload.exp) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    // Check whether this specific JWT has been revoked.
    const revokedToken = await this.databaseService.revokedToken.findUnique({
      where: { jti: payload.jti },
      select: { id: true },
    });

    if (revokedToken) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Check whether the account has been soft-deleted.
    // A deleted account's existing JWTs must stop working immediately —
    // we can't wait for them to expire naturally.
    const merchant = await this.databaseService.merchant.findUnique({
      where: { id: payload.sub },
      select: { deletedAt: true },
    });

    if (!merchant || merchant.deletedAt) {
      throw new UnauthorizedException('This account no longer exists');
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  }

}
