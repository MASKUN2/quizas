import { CommentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/** Filters for the admin moderation list. */
export class QueryCommentsDto {
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;

  @IsOptional()
  @IsString()
  postId?: string;
}
