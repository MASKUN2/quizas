import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../common/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTagDto) {
    try {
      return await this.prisma.tag.create({
        data: {
          name: dto.name,
          slug: dto.slug ? slugify(dto.slug) : slugify(dto.name),
        },
      });
    } catch (err) {
      this.rethrow(err);
    }
  }

  findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { posts: { where: { deletedAt: null } } } },
      },
    });
  }

  async findOne(idOrSlug: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        _count: { select: { posts: { where: { deletedAt: null } } } },
      },
    });
    if (!tag) throw new NotFoundException(`Tag not found: ${idOrSlug}`);
    return tag;
  }

  async update(id: string, dto: UpdateTagDto) {
    await this.ensureExists(id);
    try {
      return await this.prisma.tag.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.slug !== undefined && { slug: slugify(dto.slug) }),
        },
      });
    } catch (err) {
      this.rethrow(err, id);
    }
  }

  async remove(id: string) {
    try {
      // implicit M:N: join rows to posts are removed automatically
      await this.prisma.tag.delete({ where: { id } });
    } catch (err) {
      this.rethrow(err, id);
    }
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.tag.findUnique({ where: { id } });
    if (!found) throw new NotFoundException(`Tag not found: ${id}`);
  }

  private rethrow(err: unknown, id?: string): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw new ConflictException('A tag with this slug already exists');
      }
      if (err.code === 'P2025') {
        throw new NotFoundException(`Tag not found: ${id}`);
      }
    }
    throw err;
  }
}
