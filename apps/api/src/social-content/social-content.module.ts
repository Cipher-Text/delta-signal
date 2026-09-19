import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { SocialContentController } from './social-content.controller';
import { SocialContentService } from './social-content.service';
import { NationalRankingService } from './national-ranking.service';

@Module({
  imports: [MediaModule],
  controllers: [SocialContentController],
  providers: [SocialContentService, NationalRankingService],
})
export class SocialContentModule {}
