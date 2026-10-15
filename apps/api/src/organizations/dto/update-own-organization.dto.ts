import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/** What an organization's own admins may change; name, type and verification stay with platform admins. */
export class UpdateOwnOrganizationDto {
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
