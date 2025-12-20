import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

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
}
