import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not in the DTO
      forbidNonWhitelisted: true, // 400 if unknown properties are sent
      transform: true, // coerce payloads to DTO types
    }),
  );
  app.enableShutdownHooks(); // graceful Prisma disconnect on SIGTERM/SIGINT
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
