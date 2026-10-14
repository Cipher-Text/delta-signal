import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Public } from '../common/decorators/roles.decorator';

@Controller('locations')
@Public()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('divisions')
  getDivisions() {
    return this.locationsService.getDivisions();
  }

  @Get('divisions/:id/activity')
  getDivisionActivity(@Param('id') id: string) {
    return this.locationsService.getDivisionActivity(id);
  }

  @Get('districts')
  getDistricts(@Query('divisionId') divisionId?: string) {
    return this.locationsService.getDistricts(divisionId);
  }

  @Get('districts/:id')
  getDistrict(@Param('id') id: string) {
    return this.locationsService.getDistrict(id);
  }

  @Get('upazilas')
  getUpazilas(
    @Query('districtId') districtId?: string,
    @Query('isThana') isThana?: string,
  ) {
    const thana = isThana === 'true' ? true : isThana === 'false' ? false : undefined;
    return this.locationsService.getUpazilas(districtId, thana);
  }

  @Get('upazilas/:id')
  getUpazila(@Param('id') id: string) {
    return this.locationsService.getUpazila(id);
  }

  @Get('unions')
  getUnions(
    @Query('upazilaId') upazilaId?: string,
    @Query('isCoastal') isCoastal?: string,
  ) {
    const coastal = isCoastal === 'true' ? true : isCoastal === 'false' ? false : undefined;
    return this.locationsService.getUnions(upazilaId, coastal);
  }

  @Get('unions/:id')
  getUnion(@Param('id') id: string) {
    return this.locationsService.getUnion(id);
  }
}
