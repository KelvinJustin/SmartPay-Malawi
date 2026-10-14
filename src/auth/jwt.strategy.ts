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
    // A token without these claims cannot be checked safely for revocation.
    if (!payload.sub || !payload.jti || !payload.exp) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    // Check whether this specific JWT has been revoked.
    const revokedToken = await this.databaseService.revokedToken.findUnique({
      where: {
        jti: payload.jti,
      },
      select: {
        id: true,
      },
    });

    if (revokedToken) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Passport attaches this identity to the request after validation.
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }

}
