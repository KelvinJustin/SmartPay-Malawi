import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [
    // Provide database access to the authentication service.
    DatabaseModule,

    // Make environment configuration available to this module.
    ConfigModule,

    //email module
    EmailModule,

    // Configure Passport to use JWT authentication by default.
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Configure JWT using the secret stored in environment variables.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Retrieve the JWT signing secret or throw an error if it is missing.
        secret: configService.getOrThrow<string>('JWT_SECRET'),

        // Set the lifetime of generated access tokens to 15 minutes.
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],

  // Register the controller that handles authentication HTTP requests.
  controllers: [AuthController],

  // Register the services, JWT strategy, and guard used by authentication.
  providers: [AuthService, JwtStrategy, JwtAuthGuard],

  // Allow other modules to use these exported providers.
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}