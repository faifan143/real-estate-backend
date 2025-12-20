import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AdminRequestsService } from './admin-requests.service';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin/requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminRequestsController {
  constructor(private readonly adminRequestsService: AdminRequestsService) {}

  @Get()
  findPending(@Query('status') status?: string) {
    return this.adminRequestsService.findPending(status);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveRequestDto) {
    return this.adminRequestsService.approve(id, dto);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() body?: { reason?: string }) {
    return this.adminRequestsService.reject(id);
  }
}
