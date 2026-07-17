import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Wraps PrismaClient as an injectable Nest provider and opens the DB
 * connection when the module boots. Graceful shutdown is handled by
 * `app.enableShutdownHooks()` in main.ts.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
