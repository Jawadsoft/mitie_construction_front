import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  summary() {
    return this.svc.summary();
  }
}
