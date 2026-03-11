import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  area?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  rooms?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floor?: number;

  @IsOptional()
  @IsString()
  @IsIn(["SALE", "RENT", "BOTH"])
  listingType?: "SALE" | "RENT" | "BOTH";

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rentPrice?: number;

  @IsOptional()
  @IsEnum(["ACTIVE", "RESERVED", "CLOSED"])
  status?: "ACTIVE" | "RESERVED" | "CLOSED";
}
