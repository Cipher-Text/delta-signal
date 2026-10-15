import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ORG_LINK_PLATFORMS } from '../organization-media.constants';

export class OrganizationLinkDto {
  @IsIn(ORG_LINK_PLATFORMS as readonly string[])
  platform!: string;

  @IsString()
  @MaxLength(500)
  url!: string;
}

export class ReplaceLinksDto {
  @IsArray()
  @ArrayMaxSize(ORG_LINK_PLATFORMS.length)
  @ValidateNested({ each: true })
  @Type(() => OrganizationLinkDto)
  links!: OrganizationLinkDto[];
}
