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

  // Build a unique slug from `base`: slugify it, then append -2, -3, … until it no
  // longer collides with another post (excludeId lets a post keep its own slug).
  // Checks all posts, incl. soft-deleted ones (whose slugs are `<slug>-deleted-<id>`).
  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = slugify(base) || 'post';
    let candidate = root;
    for (let n = 2; ; n++) {
      const clash = await this.prisma.post.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!clash) return candidate;
      candidate = `${root}-${n}`;
    }
  }

  async create(dto: CreatePostDto) {
    const status = dto.status ?? PostStatus.DRAFT;
    const data: Prisma.PostCreateInput = {
      title: dto.title,
      content: dto.content,
      excerpt: dto.excerpt,
      // Drafts carry no slug; a published post gets one derived from its title.
      slug:
        status === PostStatus.PUBLISHED
          ? await this.uniqueSlug(dto.title)
          : null,
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
      deletedAt: null, // soft-deleted posts are hidden from everyone, admin included
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
      where: { deletedAt: null, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
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
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Post not found: ${id}`);
    }

    const data: Prisma.PostUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.content !== undefined && {
        content: dto.content,
        readingTime: readingTimeMinutes(dto.content),
      }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
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

    // Slug is service-managed by the effective status: a published post's slug is
    // (re)derived from its title and de-duplicated on collision (so editing the
    // title changes the slug); a draft has no slug. Applies to autosave too.
    const effectiveStatus = dto.status ?? existing.status;
    data.slug =
      effectiveStatus === PostStatus.PUBLISHED
        ? await this.uniqueSlug(dto.title ?? existing.title, id)
        : null;

    return this.prisma.post.update({
      where: { id },
      data,
      include: { category: true, tags: true, series: true },
    });
  }

  // Soft delete: mark the post deleted and release its unique slug (so the same
  // slug can be reused by a new post) instead of removing the row. The post and
  // its comments stay in the database, hidden everywhere and recoverable there.
  async remove(id: string) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Post not found: ${id}`);
    }
    await this.prisma.post.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        // Append the (unique) id so the freed slug can't collide with anything.
        // A draft has no slug (null) — nothing to release, so leave it null.
        slug: existing.slug ? `${existing.slug}-deleted-${id}` : null,
      },
    });
  }
}
