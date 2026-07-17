import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../common/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug: dto.slug ? slugify(dto.slug) : slugify(dto.name),
          description: dto.description,
        },
      });
    } catch (err) {
      this.rethrow(err);
    }
  }

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
  }

  async findOne(idOrSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { _count: { select: { posts: true } } },
    });
    if (!category) {
      throw new NotFoundException(`Category not found: ${idOrSlug}`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.slug !== undefined && { slug: slugify(dto.slug) }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
        },
      });
    } catch (err) {
      this.rethrow(err, id);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (err) {
      this.rethrow(err, id);
    }
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) throw new NotFoundException(`Category not found: ${id}`);
  }

  /** Maps known Prisma errors to HTTP responses; rethrows anything else. */
  private rethrow(err: unknown, id?: string): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw new ConflictException('A category with this slug already exists');
      }
      if (err.code === 'P2003') {
        throw new ConflictException(
          'Category still has posts; reassign them first',
        );
      }
      if (err.code === 'P2025') {
        throw new NotFoundException(`Category not found: ${id}`);
      }
    }
    throw err;
  }
}
