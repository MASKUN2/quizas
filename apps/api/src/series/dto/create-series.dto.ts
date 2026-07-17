import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSeriesDto {
  @IsString()
  @MinLength(1)
  title: string;

  /** URL slug; generated from the title when omitted. */
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
