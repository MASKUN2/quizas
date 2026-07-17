import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from '../auth/admin.guard';
import { isAdminToken } from '../auth/is-admin';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreatePostDto) {
    return this.posts.create(dto);
  }

  @Get()
  findAll(
    @Query() query: QueryPostsDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.posts.findAll(query, isAdminToken(auth, this.config));
  }

  @Get(':idOrSlug')
  findOne(
    @Param('idOrSlug') idOrSlug: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.posts.findOne(idOrSlug, isAdminToken(auth, this.config));
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.posts.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.posts.remove(id);
  }
}
