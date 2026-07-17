import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

// All CreatePostDto fields become optional, keeping their validation rules.
export class UpdatePostDto extends PartialType(CreatePostDto) {}
