import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/roles.decorator';
import { MarineService } from './marine.service';

@Controller('marine')
@Public()
export class MarineController {
  constructor(private readonly marineService: MarineService) {}

  /** Latest row per district, or every district for one day with `?date=YYYY-MM-DD`. */
  @Get('forecast')
  forAllDistricts(@Query('date') date?: string) {
    if (!date) return this.marineService.getLatestForAllDistricts();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return this.marineService.getForDate(date);
  }

  @Get('forecast-days')
  forecastDays() {
    return this.marineService.getForecastDays();
  }

  @Get('forecast/:districtId')
  async forecast(
    @Param('districtId') districtId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to
      ? new Date(to)
      : new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const rows = await this.marineService.getForecast(districtId, fromDate, toDate);
    if (!rows.length) throw new NotFoundException('No marine forecast for this district');
    return rows;
  }
}
