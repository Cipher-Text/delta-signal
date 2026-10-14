import { IsIn, IsOptional, IsString, IsDateString } from 'class-validator';

export class EcoBriefQueryDto {
  @IsIn(['COUNTRY', 'DIVISION', 'DISTRICT'])
  areaType!: 'COUNTRY' | 'DIVISION' | 'DISTRICT';

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  topics?: string;

  /** Observations: `research` keeps research-grade records only; default `all` keeps every non-flagged record. */
  @IsOptional()
  @IsIn(['all', 'research'])
  trust?: 'all' | 'research';
}
