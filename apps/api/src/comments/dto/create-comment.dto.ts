import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Public comment submission. Always created as PENDING for moderation. */
export class CreateCommentDto {
  @IsString()
  postId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  authorName: string;

  /** Optional; never exposed publicly, used for moderation/notifications. */
  @IsOptional()
  @IsEmail()
  authorEmail?: string;

  /** Reply to an existing comment on the same post. */
  @IsOptional()
  @IsString()
  parentId?: string;
}
