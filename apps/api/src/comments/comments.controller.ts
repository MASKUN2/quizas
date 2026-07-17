import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  /** Public: anyone can submit; it stays hidden until an admin approves. */
  @Post()
  create(@Body() dto: CreateCommentDto) {
    return this.comments.create(dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  findAll(@Query() query: QueryCommentsDto) {
    return this.comments.findAll(query);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  moderate(@Param('id') id: string, @Body() dto: ModerateCommentDto) {
    return this.comments.moderate(id, dto.status);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.comments.remove(id);
  }
}
