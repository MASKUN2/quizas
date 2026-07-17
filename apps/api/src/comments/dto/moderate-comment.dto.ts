import { CommentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/** Admin moderation: move a comment between PENDING / APPROVED / SPAM. */
export class ModerateCommentDto {
  @IsEnum(CommentStatus)
  status: CommentStatus;
}
