import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkPublishedDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
