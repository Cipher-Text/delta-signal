import { IsIn, IsUrl, Matches, IsOptional, Length, IsString, MaxLength } from 'class-validator';
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

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsIn(ORGANIZATION_TYPES)
  type!: OrganizationType;

  /** Lowercase letters, digits and single hyphens (3–80 characters). Generated from the name when omitted on create. */
  @IsOptional()
  @IsString()
  @Length(3, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug may only contain lowercase letters, digits and single hyphens' })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;
}
