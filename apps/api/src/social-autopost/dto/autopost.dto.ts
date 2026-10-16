import { SocialCardFormat } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { AUTOPOST_CONTENT, TIME_PATTERN } from '../social-autopost.schedule';

export class AutopostSlotDto {
  /** 0 = Sunday … 6 = Saturday. */
  @IsInt() @Min(0) @Max(6)
  dayOfWeek!: number;

  /** 0 = the day's first post, 1 = second, 2 = third. */
  @IsInt() @Min(0) @Max(2)
  position!: number;

  @IsBoolean()
  enabled!: boolean;

  /** "HH:mm" in Bangladesh time. */
  @IsString() @Matches(TIME_PATTERN, { message: 'timeOfDay must be HH:mm (24-hour), Bangladesh time' })
  timeOfDay!: string;

  @IsIn(AUTOPOST_CONTENT as readonly string[])
  content!: string;

  @IsEnum(SocialCardFormat)
  format!: SocialCardFormat;
}

export class UpdateAutopostDto {
  /** The connected Page to post to; null clears it. */
  @IsOptional() @IsString()
  platformAccountId?: string | null;

  @IsOptional() @IsString() @MaxLength(280)
  captionFooter?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(21) @ValidateNested({ each: true }) @Type(() => AutopostSlotDto)
  slots?: AutopostSlotDto[];
}

export class ToggleAutopostDto {
  @IsBoolean()
  enabled!: boolean;

  /** Required when turning the routine on: the administrator confirms posts publish without review. */
  @IsOptional() @IsBoolean()
  acknowledged?: boolean;
}
