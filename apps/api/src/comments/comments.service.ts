import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public submission: only on published posts, always PENDING. */
  async create(dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
      select: { id: true, status: true },
    });
    if (!post || post.status !== 'PUBLISHED') {
      throw new NotFoundException(`Post not found: ${dto.postId}`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { postId: true },
      });
      if (!parent || parent.postId !== dto.postId) {
        throw new BadRequestException('Parent comment does not belong to this post');
      }
    }

    return this.prisma.comment.create({
      data: {
        content: dto.content,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        status: CommentStatus.PENDING,
        post: { connect: { id: dto.postId } },
        ...(dto.parentId && { parent: { connect: { id: dto.parentId } } }),
      },
      select: { id: true, status: true, createdAt: true },
    });
  }

  /** Admin moderation list. */
  findAll(query: QueryCommentsDto) {
    return this.prisma.comment.findMany({
      where: {
        ...(query.status && { status: query.status }),
        ...(query.postId && { postId: query.postId }),
      },
      include: { post: { select: { title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderate(id: string, status: CommentStatus) {
    try {
      return await this.prisma.comment.update({ where: { id }, data: { status } });
    } catch (err) {
      this.rethrow(err, id);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.comment.delete({ where: { id } });
    } catch (err) {
      this.rethrow(err, id);
    }
  }

  private rethrow(err: unknown, id: string): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      throw new NotFoundException(`Comment not found: ${id}`);
    }
    throw err;
  }
}
