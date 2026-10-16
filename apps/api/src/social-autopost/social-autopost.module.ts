import { Module } from '@nestjs/common';
import { SocialContentModule } from '../social-content/social-content.module';
import { SocialPublishingModule } from '../social-publishing/social-publishing.module';
import { SocialAutopostController } from './social-autopost.controller';
import { SocialAutopostScheduler } from './social-autopost.scheduler';
import { SocialAutopostService } from './social-autopost.service';

@Module({
  imports: [SocialContentModule, SocialPublishingModule],
  controllers: [SocialAutopostController],
  providers: [SocialAutopostService, SocialAutopostScheduler],
})
export class SocialAutopostModule {}
