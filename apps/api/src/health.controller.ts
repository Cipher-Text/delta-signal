import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/roles.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'delta-signal-api',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }
}
