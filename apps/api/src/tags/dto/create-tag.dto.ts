import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  name: string;

  /** URL slug; generated from the name when omitted. */
  @IsOptional()
  @IsString()
  slug?: string;
}
