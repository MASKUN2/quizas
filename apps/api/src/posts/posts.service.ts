import { Injectable, NotFoundException } from '@nestjs/common';
import { PostStatus, Prisma } from '@prisma/client';
import { slugify } from '../common/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';

/** Rough reading time in minutes at ~200 wpm, minimum 1. */
function readingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePostDto) {
    const status = dto.status ?? PostStatus.DRAFT;
    const data: Prisma.PostCreateInput = {
      title: dto.title,
      content: dto.content,
      excerpt: dto.excerpt,
      slug: dto.slug ? slugify(dto.slug) : slugify(dto.title),
      status,
      readingTime: readingTimeMinutes(dto.content),
      publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
      category: { connect: { id: dto.categoryId } },
      ...(dto.seriesId && {
        series: { connect: { id: dto.seriesId } },
        seriesOrder: dto.seriesOrder,
      }),
      ...(dto.tagIds?.length && {
        tags: { connect: dto.tagIds.map((id) => ({ id })) },
      }),
    };
    return this.prisma.post.create({
      data,
      include: { category: true, tags: true, series: true },
    });
  }

  findAll(query: QueryPostsDto, isAdmin = false) {
    const where: Prisma.PostWhereInput = {
      // Non-admins only ever see published posts; any client-supplied
      // status filter is ignored so drafts can't leak.
      status: isAdmin ? query.status : PostStatus.PUBLISHED,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.category && { category: { slug: query.category } }),
      ...(query.tag && { tags: { some: { slug: query.tag } } }),
    };
    return this.prisma.post.findMany({
      where,
      include: { category: true, tags: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(idOrSlug: string, isAdmin = false) {
    const post = await this.prisma.post.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        category: true,
        tags: true,
        series: true,
        comments: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'asc' },
          // authorEmail and status are intentionally omitted from public output.
          select: {
            id: true,
            content: true,
            authorName: true,
            createdAt: true,
            parentId: true,
          },
        },
      },
    });
    // Hide a draft's existence from non-admins (404, not 403).
    if (!post || (!isAdmin && post.status !== PostStatus.PUBLISHED)) {
      throw new NotFoundException(`Post not found: ${idOrSlug}`);
    }
    return post;
  }

  async update(id: string, dto: UpdatePostDto) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Post not found: ${id}`);

    const data: Prisma.PostUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.content !== undefined && {
        content: dto.content,
        readingTime: readingTimeMinutes(dto.content),
      }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
      ...(dto.slug !== undefined && { slug: slugify(dto.slug) }),
      ...(dto.seriesOrder !== undefined && { seriesOrder: dto.seriesOrder }),
      ...(dto.categoryId !== undefined && {
        category: { connect: { id: dto.categoryId } },
      }),
      ...(dto.tagIds !== undefined && {
        tags: { set: dto.tagIds.map((tagId) => ({ id: tagId })) },
      }),
      ...(dto.seriesId !== undefined && {
        series: dto.seriesId
          ? { connect: { id: dto.seriesId } }
          : { disconnect: true },
      }),
    };

    // Stamp publishedAt the first time a post is published.
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === PostStatus.PUBLISHED && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    return this.prisma.post.update({
      where: { id },
      data,
      include: { category: true, tags: true, series: true },
    });
  }

  async remove(id: string) {
    try {
      await this.prisma.post.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException(`Post not found: ${id}`);
      }
      throw err;
    }
  }
}
