import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PropertyImagesService {
  constructor(private prisma: PrismaService) {}

  async create(propertyId: number, userId: number, role: string, fileName: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (role !== 'ADMIN' && property.ownerId !== userId) {
      throw new ForbiddenException();
    }

    const image = await this.prisma.propertyImage.create({
      data: {
        propertyId,
        fileName,
      },
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    return {
      imageId: image.id.toString(),
      fileName: image.fileName,
      url: `${baseUrl}/uploads/${image.fileName}`,
    };
  }

  async remove(propertyId: number, imageId: number, userId: number, role: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (role !== 'ADMIN' && property.ownerId !== userId) {
      throw new ForbiddenException();
    }

    const image = await this.prisma.propertyImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.propertyId !== propertyId) {
      throw new NotFoundException('Image not found');
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', image.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.prisma.propertyImage.delete({
      where: { id: imageId },
    });

    return { success: true };
  }
}
