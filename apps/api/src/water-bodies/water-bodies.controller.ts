import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { HydrologicalClass, WaterBodyType } from '@prisma/client';
import { Public } from '../common/decorators/roles.decorator';
import { WaterBodiesService } from './water-bodies.service';

@Controller('water-bodies')
@Public()
export class WaterBodiesController {
  constructor(private readonly service: WaterBodiesService) {}

  @Get()
  list(
    @Query('class') hydrologicalClass?: HydrologicalClass,
    @Query('waterBodyType') waterBodyType?: WaterBodyType,
    @Query('waterBodySubtype') waterBodySubtype?: string,
    @Query('upazilaId') upazilaId?: string,
    @Query('districtId') districtId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      hydrologicalClass,
      waterBodyType,
      waterBodySubtype,
      upazilaId,
      districtId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    });
  }

  @Get('subtypes')
  subtypes() {
    return this.service.listSubtypes();
  }

  @Get('stations')
  listStations(
    @Query('districtId') districtId?: string,
    @Query('upazilaId') upazilaId?: string,
    @Query('waterBodyId') waterBodyId?: string,
    @Query('tidalStatus') tidalStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listStations({
      districtId,
      upazilaId,
      waterBodyId,
      tidalStatus,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);
    if (!result) throw new NotFoundException('Water body not found');
    return result;
  }
}
