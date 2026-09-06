import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { OrganizationType } from '@delta-signal/shared';

const ORGANIZATION_TYPES: OrganizationType[] = [
  'GOVERNMENT_AGENCY',
  'RESEARCH_INSTITUTION',
  'NGO',
  'COMMUNITY_GROUP',
  'PRIVATE_COMPANY',
  'INTERNATIONAL_ORG',
  'OTHER',
];

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsIn(ORGANIZATION_TYPES)
  type?: OrganizationType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
