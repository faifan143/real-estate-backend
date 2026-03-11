import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { UpdatePropertyDto } from "./dto/update-property.dto";

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreatePropertyDto, images: string[] = []) {
    const address = dto.address || "";
    const location = dto.location || address;

    // Mapping legacy 'price' to 'salePrice' if salePrice is not explicitly provided
    const salePrice = dto.salePrice ?? dto.price ?? 0;
    const rentPrice = dto.rentPrice ?? null;
    const listingType = dto.listingType || "SALE";

    const property = await this.prisma.property.create({
      data: {
        title: dto.title,
        type: dto.type,
        listingType: listingType,
        address: dto.address || null,
        description: dto.description || null,
        price: salePrice, // Keep for compatibility
        salePrice: salePrice,
        rentPrice: rentPrice,
        location: location,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        area: dto.area ?? null,
        rooms: dto.rooms ?? null,
        floor: dto.floor ?? null,
        ownerId: userId,
        images: {
          create: images.map((fileName) => ({
            fileName,
          })),
        },
      },
    });

    return {
      propertyId: property.id.toString(),
    };
  }

  async findAll() {
    const properties = await this.prisma.property.findMany({
      include: {
        images: true,
      },
    });

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    return properties.map((property) => ({
      propertyId: property.id.toString(),
      title: property.title,
      type: property.type,
      listingType: property.listingType,
      status: property.status,
      salePrice: property.salePrice ?? property.price,
      rentPrice: property.rentPrice,
      images: property.images.map((img) => ({
        imageId: img.id.toString(),
        fileName: img.fileName,
        url: `${baseUrl}/uploads/${img.fileName}`,
      })),
    }));
  }

  async findOne(id: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        images: true,
      },
    });

    if (!property) {
      throw new NotFoundException("Property not found");
    }

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const formattedImages = property.images.map((img) => ({
      imageId: img.id.toString(),
      fileName: img.fileName,
      url: `${baseUrl}/uploads/${img.fileName}`,
    }));

    return {
      propertyId: property.id.toString(),
      ownerId: property.ownerId.toString(),
      title: property.title,
      type: property.type,
      listingType: property.listingType,
      address: property.address || undefined,
      description: property.description || undefined,
      price: property.price,
      salePrice: property.salePrice ?? property.price,
      rentPrice: property.rentPrice ?? undefined,
      location: property.location,
      latitude: property.latitude ?? undefined,
      longitude: property.longitude ?? undefined,
      area: property.area ?? undefined,
      rooms: property.rooms ?? undefined,
      floor: property.floor ?? undefined,
      status: property.status,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
      images: formattedImages,
    };
  }

  async update(
    id: number,
    userId: number,
    role: string,
    dto: UpdatePropertyDto,
    images: string[] = [],
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException("Property not found");
    }

    if (role !== "ADMIN" && property.ownerId !== userId) {
      throw new ForbiddenException();
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.listingType !== undefined) updateData.listingType = dto.listingType;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.description !== undefined) updateData.description = dto.description;

    if (dto.salePrice !== undefined) {
      updateData.salePrice = dto.salePrice;
      updateData.price = dto.salePrice; // Keep in sync
    } else if (dto.price !== undefined) {
      updateData.price = dto.price;
      updateData.salePrice = dto.price;
    }

    if (dto.rentPrice !== undefined) updateData.rentPrice = dto.rentPrice;

    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.area !== undefined) updateData.area = dto.area;
    if (dto.rooms !== undefined) updateData.rooms = dto.rooms;
    if (dto.floor !== undefined) updateData.floor = dto.floor;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (images.length > 0) {
      updateData.images = {
        create: images.map((fileName) => ({
          fileName,
        })),
      };
    }

    await this.prisma.property.update({
      where: { id },
      data: updateData,
    });

    return { success: true };
  }

  async remove(id: number, userId: number, role: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException("Property not found");
    }

    if (property.status !== "ACTIVE") {
      throw new BadRequestException("Only ACTIVE properties can be deleted");
    }

    if (role !== "ADMIN" && property.ownerId !== userId) {
      throw new ForbiddenException();
    }

    await this.prisma.property.delete({
      where: { id },
    });

    return { success: true };
  }
}
