import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MediaModule } from '../media/media.module';
import { AuthModule } from '../auth/auth.module';
import { SocialPublishingController, SocialDraftPublishController } from './social-publishing.controller';
import { SocialPublishingService } from './social-publishing.service';
import { SocialPublishProcessor } from './social-publish.processor';
import { TokenCipherService } from './token-cipher.service';
import { ImageRasterizerService } from './image-rasterizer.service';
import { FacebookPublisher } from './platforms/facebook.publisher';
import { SOCIAL_PUBLISH_QUEUE } from './social-publish.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: SOCIAL_PUBLISH_QUEUE }),
    MediaModule,
    AuthModule, // exports JwtModule — used to sign/verify the OAuth `state` param
  ],
  controllers: [SocialPublishingController, SocialDraftPublishController],
  providers: [SocialPublishingService, SocialPublishProcessor, TokenCipherService, ImageRasterizerService, FacebookPublisher],
})
export class SocialPublishingModule {}
