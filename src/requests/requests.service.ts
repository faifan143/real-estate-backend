import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async create(propertyId: number, userId: number, dto: CreateRequestDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.status !== 'ACTIVE') {
      throw new BadRequestException('Property is not available');
    }

    if (property.ownerId === userId) {
      throw new BadRequestException('Cannot request your own property');
    }

    const existingActiveRequest = await this.prisma.transactionRequest.findFirst({
      where: {
        propertyId,
        requesterId: userId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existingActiveRequest) {
      throw new ConflictException('You already have an active request for this property');
    }

    const request = await this.prisma.transactionRequest.create({
      data: {
        propertyId,
        requesterId: userId,
        type: dto.type,
      },
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
    });

    return {
      requestId: request.id.toString(),
      status: request.status,
    };
  }

  async findMyRequests(userId: number) {
    const requests = await this.prisma.transactionRequest.findMany({
      where: { requesterId: userId },
      select: {
        id: true,
        propertyId: true,
        type: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((req) => ({
      requestId: req.id.toString(),
      propertyId: req.propertyId.toString(),
      type: req.type,
      status: req.status,
      createdAt: req.createdAt.toISOString(),
    }));
  }

  async findOne(id: number, userId: number, role: string) {
    const request = await this.prisma.transactionRequest.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            location: true,
            price: true,
            ownerId: true,
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
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (role !== 'ADMIN' && request.requesterId !== userId && request.property.ownerId !== userId) {
      throw new ForbiddenException();
    }

    return {
      requestId: request.id.toString(),
      propertyId: request.property.id.toString(),
      requesterId: request.requesterId.toString(),
      type: request.type,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      decisionAt: request.decisionAt ? request.decisionAt.toISOString() : undefined,
    };
  }
}
