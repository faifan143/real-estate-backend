import { Controller, Get, Header } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  @Header('Access-Control-Allow-Origin', '*')
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

