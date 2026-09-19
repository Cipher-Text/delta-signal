import { SocialCardFormat } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSocialDraftDto {
  @IsOptional()
  @IsEnum(SocialCardFormat)
  format?: SocialCardFormat;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  locale?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  disclaimer?: string;
}
