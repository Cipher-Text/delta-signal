import { IsString } from 'class-validator';

export class PublishDraftDto {
  @IsString()
  platformAccountId!: string;
}
