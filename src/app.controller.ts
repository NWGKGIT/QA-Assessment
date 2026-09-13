import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('Health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  @ApiOperation({
    summary: 'Liveness check — returns service status and uptime',
  })
  getHealth(): { status: string; uptime: number; timestamp: string } {
    return this.appService.getHealth();
  }
}
