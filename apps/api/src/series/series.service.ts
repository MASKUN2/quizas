import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../common/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSeriesDto) {
    try {
      return await this.prisma.series.create({
        data: {
          title: dto.title,
          slug: dto.slug ? slugify(dto.slug) : slugify(dto.title),
          description: dto.description,
        },
      });
    } catch (err) {
      this.rethrow(err);
    }
  }

  findAll() {
    return this.prisma.series.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { posts: true } } },
    });
  }

  /** Series with its published posts in reading order. */
  async findOne(idOrSlug: string) {
    const series = await this.prisma.series.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        posts: {
          where: { status: 'PUBLISHED' },
          orderBy: [{ seriesOrder: 'asc' }, { publishedAt: 'asc' }],
          include: { category: true, tags: true },
        },
      },
    });
    if (!series) throw new NotFoundException(`Series not found: ${idOrSlug}`);
    return series;
  }

  async update(id: string, dto: UpdateSeriesDto) {
    await this.ensureExists(id);
    try {
      return await this.prisma.series.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.slug !== undefined && { slug: slugify(dto.slug) }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
      });
    } catch (err) {
      this.rethrow(err, id);
    }
  }

  async remove(id: string) {
    // Optional relation: deleting a series sets its posts' seriesId to null.
    try {
      await this.prisma.series.delete({ where: { id } });
    } catch (err) {
      this.rethrow(err, id);
    }
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.series.findUnique({ where: { id } });
    if (!found) throw new NotFoundException(`Series not found: ${id}`);
  }

  private rethrow(err: unknown, id?: string): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw new ConflictException('A series with this slug already exists');
      }
      if (err.code === 'P2025') {
        throw new NotFoundException(`Series not found: ${id}`);
      }
    }
    throw err;
  }
}
