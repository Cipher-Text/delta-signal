import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReviewResearcherApplicationDto {
  @IsIn(['NEEDS_INFORMATION', 'APPROVED', 'DECLINED'])
  status!: 'NEEDS_INFORMATION' | 'APPROVED' | 'DECLINED';

  @IsOptional() @IsString() @MinLength(5) @MaxLength(2000)
  reviewerNote?: string;
}
