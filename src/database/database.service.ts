import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Create a logger for database lifecycle events and errors.
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    // Read the PostgreSQL connection string from the environment.
    const connectionString = process.env.DATABASE_URL;

    // Fail at startup if the database connection string is missing.
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    // Configure Prisma to connect to PostgreSQL through the pg adapter.
    const adapter = new PrismaPg({
      connectionString,
    });

    // Initialize PrismaClient with the configured database adapter.
    super({ adapter });
  }

  // NestJS calls this method when the application starts.
  async onModuleInit() {
    try {
      // Establish the database connection before serving requests.
      await this.$connect();
      this.logger.log('Database connected');
    } catch (error) {
      // Log the connection failure and prevent startup from continuing.
      this.logger.error('Failed to connect to the database', error);

      // Let the application fail to start rather than run without a database.
      throw error;
    }
  }

  // NestJS calls this method when the application shuts down.
  async onModuleDestroy() {
    try {
      // Close the database connection cleanly.
      await this.$disconnect();
      this.logger.log('Database disconnected');
    } catch (error) {
      // Record disconnection failures for troubleshooting.
      this.logger.error('Failed to disconnect from the database', error);
    }
  }
}