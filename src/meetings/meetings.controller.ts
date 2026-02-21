import { Controller, Get, Param, Post, UseGuards, ParseIntPipe } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get('admin/meetings')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllMeetings() {
    return this.meetingsService.findAllMeetings();
  }

  @Get('me/meetings')
  @UseGuards(RolesGuard)
  @Roles('USER')
  findMyMeetings(@CurrentUser() user: { userId: number }) {
    return this.meetingsService.findMyMeetings(user.userId);
  }

  @Get('meetings/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number; role: string }) {
    return this.meetingsService.findOne(id, user.userId, user.role);
  }

  @Post('admin/meetings/:id/complete')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  completeMeeting(@Param('id', ParseIntPipe) id: number) {
    return this.meetingsService.completeMeeting(id);
  }

  @Post('admin/meetings/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  cancelMeeting(@Param('id', ParseIntPipe) id: number) {
    return this.meetingsService.cancelMeeting(id);
  }
}
