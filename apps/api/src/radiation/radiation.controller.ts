import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/roles.decorator';
import { RadiationService } from './radiation.service';

@Controller('radiation')
@Public()
export class RadiationController {
  constructor(private readonly radiationService: RadiationService) {}

  /** Latest row per district, or every district for one day with `?date=YYYY-MM-DD`. */
  @Get('daily')
  forAllDistricts(@Query('date') date?: string) {
    if (!date) return this.radiationService.getLatestForAllDistricts();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return this.radiationService.getForDate(date);
  }

  @Get('days')
  days() {
    return this.radiationService.getDays();
  }

  @Get('daily/:districtId')
  async readings(
    @Param('districtId') districtId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to
      ? new Date(to)
      : new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const rows = await this.radiationService.getReadings(districtId, fromDate, toDate);
    if (!rows.length) throw new NotFoundException('No satellite radiation readings for this district');
    return rows;
  }
}
