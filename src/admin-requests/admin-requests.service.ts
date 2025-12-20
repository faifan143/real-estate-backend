import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveRequestDto } from './dto/approve-request.dto';

@Injectable()
export class AdminRequestsService {
  constructor(private prisma: PrismaService) {}

  async findPending(status?: string) {
    const requests = await this.prisma.transactionRequest.findMany({
      where: status ? { status: status as any } : { status: 'PENDING' },
      select: {
        id: true,
        propertyId: true,
        requesterId: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((req) => ({
      requestId: req.id.toString(),
      propertyId: req.propertyId.toString(),
      requesterId: req.requesterId.toString(),
      type: req.type,
      createdAt: req.createdAt.toISOString(),
    }));
  }

  async approve(id: number, dto: ApproveRequestDto) {
    return await this.prisma.$transaction(async (tx) => {
      const request = await tx.transactionRequest.findUnique({
        where: { id },
        include: {
          property: {
            include: {
              owner: true,
            },
          },
          requester: true,
        },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (request.status !== 'PENDING') {
        throw new BadRequestException('Request is not pending');
      }

      if (request.property.status !== 'ACTIVE') {
        throw new BadRequestException('Property is not active');
      }

      const existingApproved = await tx.transactionRequest.findFirst({
        where: {
          propertyId: request.propertyId,
          status: 'APPROVED',
          id: { not: id },
        },
      });

      if (existingApproved) {
        throw new ConflictException('Property already has an approved request');
      }

      const now = new Date();
      const updatedRequest = await tx.transactionRequest.update({
        where: { id },
        data: { 
          status: 'APPROVED',
          decisionAt: now,
        },
      });

      await tx.transactionRequest.updateMany({
        where: {
          propertyId: request.propertyId,
          status: 'PENDING',
          id: { not: id },
        },
        data: { 
          status: 'REJECTED',
          decisionAt: now,
        },
      });

      await tx.property.update({
        where: { id: request.propertyId },
        data: { status: 'RESERVED' },
      });

      const meeting = await tx.meeting.create({
        data: {
          propertyId: request.propertyId,
          transactionRequestId: id,
          buyerId: request.requesterId,
          sellerId: request.property.ownerId,
          scheduledAt: new Date(dto.scheduledAt),
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });

      return {
        requestId: updatedRequest.id.toString(),
        newStatus: 'APPROVED',
        meetingId: meeting.id.toString(),
      };
    });
  }

  async reject(id: number) {
    const request = await this.prisma.transactionRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is not pending');
    }

    const updated = await this.prisma.transactionRequest.update({
      where: { id },
      data: { 
        status: 'REJECTED',
        decisionAt: new Date(),
      },
    });

    return {
      requestId: updated.id.toString(),
      newStatus: 'REJECTED',
    };
  }
}
