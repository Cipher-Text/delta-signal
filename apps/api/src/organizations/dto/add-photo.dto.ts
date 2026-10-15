import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddPhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}
