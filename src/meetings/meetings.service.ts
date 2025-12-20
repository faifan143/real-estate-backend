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
      id: meeting.id,
      scheduledAt: meeting.scheduledAt,
      latitude: meeting.latitude,
      longitude: meeting.longitude,
      status: meeting.status,
      property: meeting.transactionRequest.property,
      buyer: meeting.buyer,
      seller: meeting.seller,
      roleInMeeting: meeting.buyerId === userId ? 'buyer' : 'seller',
      createdAt: meeting.createdAt,
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
      id: meeting.id,
      scheduledAt: meeting.scheduledAt,
      latitude: meeting.latitude,
      longitude: meeting.longitude,
      status: meeting.status,
      property: meeting.transactionRequest.property,
      buyer: meeting.buyer,
      seller: meeting.seller,
      createdAt: meeting.createdAt,
    };
  }
}
