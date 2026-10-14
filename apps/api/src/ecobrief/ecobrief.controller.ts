import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../common/decorators/roles.decorator';
import { EcoBriefQueryDto } from './dto/ecobrief-query.dto';
import { EcoBriefService } from './ecobrief.service';

@Controller('ecobriefs')
export class EcoBriefController {
  constructor(private readonly service: EcoBriefService) {}

  @Public()
  @Get()
  generate(@Query() query: EcoBriefQueryDto) {
    if (query.areaType === 'COUNTRY' && query.areaId) {
      throw new BadRequestException('areaId must be omitted for COUNTRY reports');
    }
    if (query.areaType !== 'COUNTRY' && !query.areaId) {
      throw new BadRequestException('areaId is required for the selected area type');
    }
    return this.service.generate(query);
  }
}
