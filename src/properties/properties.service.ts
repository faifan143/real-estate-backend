import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreatePropertyDto) {
    const property = await this.prisma.property.create({
      data: {
        ...dto,
        ownerId: userId,
      },
    });

    return this.formatProperty(property);
  }

  async findAll() {
    const properties = await this.prisma.property.findMany({
      include: {
        owner: {
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

    return properties.map((property) => this.formatProperty(property));
  }

  async findOne(id: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        images: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const formattedImages = property.images.map((img) => ({
      imageId: img.id,
      fileName: img.fileName,
      url: `${baseUrl}/uploads/${img.fileName}`,
    }));

    return {
      ...this.formatProperty(property),
      images: formattedImages,
    };
  }

  async update(id: number, userId: number, role: string, dto: UpdatePropertyDto) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (role !== 'ADMIN' && property.ownerId !== userId) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: dto,
    });

    return this.formatProperty(updated);
  }

  async remove(id: number, userId: number, role: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.status !== 'ACTIVE') {
      throw new BadRequestException('Only ACTIVE properties can be deleted');
    }

    if (role !== 'ADMIN' && property.ownerId !== userId) {
      throw new ForbiddenException();
    }

    await this.prisma.property.delete({
      where: { id },
    });

    return { message: 'Property deleted successfully' };
  }

  private formatProperty(property: any) {
    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      location: property.location,
      latitude: property.latitude,
      longitude: property.longitude,
      area: property.area,
      rooms: property.rooms,
      floor: property.floor,
      status: property.status,
      ownerId: property.ownerId,
      owner: property.owner,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }
}
