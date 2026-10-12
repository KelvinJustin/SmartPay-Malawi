import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Dependency injection: configService is used to retrieve the JWT signing secret.
  constructor(configService: ConfigService) {
    super({

      //extracts the jwt token from the browser cookies
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => request?.cookies?.access_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),

      // If false, the strategy will reject requests with expired tokens.
      ignoreExpiration: false,

      // This is the secret used to sign and verify the JWT. It must match
      // the secret used by JwtService.signAsync().
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    // The JWT payload contains the claims from the JWT that was signed
    // at login. This method extracts the claims and returns them as the
    // authenticated identity, which will be attached to the Request object
    // for downstream handlers, including the @UseGuards (JwtAuthGuard) and
    // any route handler that needs the user's ID and email.

    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
