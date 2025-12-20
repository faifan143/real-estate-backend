import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveRequestDto } from './dto/approve-request.dto';

@Injectable()
export class AdminRequestsService {
  constructor(private prisma: PrismaService) {}

  async findPending(status?: string) {
    const requests = await this.prisma.transactionRequest.findMany({
      where: status ? { status: status as any } : { status: 'PENDING' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            location: true,
            price: true,
            status: true,
          },
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((req) => ({
      id: req.id,
      type: req.type,
      status: req.status,
      property: req.property,
      requester: req.requester,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
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

      const updatedRequest = await tx.transactionRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      await tx.transactionRequest.updateMany({
        where: {
          propertyId: request.propertyId,
          status: 'PENDING',
          id: { not: id },
        },
        data: { status: 'REJECTED' },
      });

      await tx.property.update({
        where: { id: request.propertyId },
        data: { status: 'RESERVED' },
      });

      const meeting = await tx.meeting.create({
        data: {
          transactionRequestId: id,
          buyerId: request.requesterId,
          sellerId: request.property.ownerId,
          scheduledAt: new Date(dto.scheduledAt),
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });

      return {
        request: {
          id: updatedRequest.id,
          type: updatedRequest.type,
          status: updatedRequest.status,
          createdAt: updatedRequest.createdAt,
          updatedAt: updatedRequest.updatedAt,
        },
        meeting: {
          id: meeting.id,
          scheduledAt: meeting.scheduledAt,
          latitude: meeting.latitude,
          longitude: meeting.longitude,
          status: meeting.status,
        },
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
      data: { status: 'REJECTED' },
    });

    return {
      id: updated.id,
      type: updated.type,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
