import { PostStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/** Optional filters for listing posts. */
export class QueryPostsDto {
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsString()
  categoryId?: string;

  /** Filter by category slug. */
  @IsOptional()
  @IsString()
  category?: string;

  /** Filter by tag slug. */
  @IsOptional()
  @IsString()
  tag?: string;
}
