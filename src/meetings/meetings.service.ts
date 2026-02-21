import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  async findAllMeetings() {
    const meetings = await this.prisma.meeting.findMany({
      include: {
        property: {
          select: {
            id: true,
            title: true,
            location: true,
            price: true,
          },
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return meetings.map((meeting) => ({
      meetingId: meeting.id.toString(),
      propertyId: meeting.propertyId.toString(),
      propertyTitle: meeting.property.title,
      propertyLocation: meeting.property.location,
      propertyPrice: meeting.property.price,
      buyerId: meeting.buyerId.toString(),
      buyerName: `${meeting.buyer.firstName} ${meeting.buyer.lastName}`,
      sellerId: meeting.sellerId.toString(),
      sellerName: `${meeting.seller.firstName} ${meeting.seller.lastName}`,
      scheduledAt: meeting.scheduledAt.toISOString(),
      latitude: meeting.latitude,
      longitude: meeting.longitude,
      status: meeting.status,
    }));
  }

  async findMyMeetings(userId: number) {
    const meetings = await this.prisma.meeting.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        transactionRequest: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                location: true,
                price: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return meetings.map((meeting) => ({
      meetingId: meeting.id.toString(),
      propertyId: meeting.propertyId.toString(),
      scheduledAt: meeting.scheduledAt.toISOString(),
      latitude: meeting.latitude,
      longitude: meeting.longitude,
      roleInMeeting: meeting.buyerId === userId ? 'BUYER' : 'SELLER',
    }));
  }

  async findOne(id: number, userId: number, role: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        transactionRequest: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                location: true,
                price: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (role !== 'ADMIN' && meeting.buyerId !== userId && meeting.sellerId !== userId) {
      throw new ForbiddenException();
    }

    return {
      meetingId: meeting.id.toString(),
      propertyId: meeting.propertyId.toString(),
      buyerId: meeting.buyerId.toString(),
      sellerId: meeting.sellerId.toString(),
      scheduledAt: meeting.scheduledAt.toISOString(),
      latitude: meeting.latitude,
      longitude: meeting.longitude,
      status: meeting.status,
    };
  }

  async completeMeeting(id: number) {
    return await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.findUnique({
        where: { id },
        include: { property: true },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      if (meeting.status !== 'SCHEDULED') {
        throw new BadRequestException('Meeting is not scheduled');
      }

      await tx.meeting.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      await tx.property.delete({
        where: { id: meeting.propertyId },
      });

      return { message: 'Meeting completed and property sold' };
    });
  }

  async cancelMeeting(id: number) {
    return await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.findUnique({
        where: { id },
        include: { property: true },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      if (meeting.status !== 'SCHEDULED') {
        throw new BadRequestException('Meeting is not scheduled');
      }

      await tx.meeting.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.property.update({
        where: { id: meeting.propertyId },
        data: { status: 'ACTIVE' },
      });

      return { message: 'Meeting cancelled and property is now active' };
    });
  }
}
