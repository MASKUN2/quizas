import { PostStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  title: string;

  /** Markdown body. */
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  /** URL slug; generated from the title when omitted. */
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  /** Required: every post belongs to one category. */
  @IsString()
  categoryId: string;

  /** Existing tag ids to attach. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsString()
  seriesId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  seriesOrder?: number;
}
