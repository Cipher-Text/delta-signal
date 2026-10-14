import { SocialCardFormat, SocialContentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class CardHighlightDto {
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  value!: string;
}

export const CARD_THEMES = ['SKY', 'RAIN', 'AIR', 'HEAT', 'RIVER', 'ALERT', 'COMMUNITY', 'WILD'] as const;

export class CreateSocialDraftDto {
  @IsEnum(SocialContentType)
  type!: SocialContentType;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  cadence?: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  stationId?: string;

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

  /** CUSTOM_EDITORIAL only: up to 4 label/value tiles shown under the headline. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CardHighlightDto)
  highlights?: CardHighlightDto[];

  /** CUSTOM_EDITORIAL only: colour theme of the card. */
  @IsOptional()
  @IsIn(CARD_THEMES)
  theme?: (typeof CARD_THEMES)[number];

  /** CUSTOM_EDITORIAL only: short label above the headline. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  kicker?: string;
}
