import { Module } from '@nestjs/common';
import { EcoBriefController } from './ecobrief.controller';
import { EcoBriefService } from './ecobrief.service';

@Module({
  controllers: [EcoBriefController],
  providers: [EcoBriefService],
})
export class EcoBriefModule {}
