import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post('properties/:propertyId/requests')
  @UseGuards(RolesGuard)
  @Roles('USER')
  create(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @CurrentUser() user: { userId: number },
    @Body() dto: CreateRequestDto,
  ) {
    return this.requestsService.create(propertyId, user.userId, dto);
  }

  @Get('me/requests')
  @UseGuards(RolesGuard)
  @Roles('USER')
  findMyRequests(@CurrentUser() user: { userId: number }) {
    return this.requestsService.findMyRequests(user.userId);
  }

  @Get('requests/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number; role: string }) {
    return this.requestsService.findOne(id, user.userId, user.role);
  }
}
