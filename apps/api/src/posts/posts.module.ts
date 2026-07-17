import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

// PrismaService is available globally via PrismaModule (@Global).
@Module({
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
